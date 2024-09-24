import { complimnets } from "../data/compliments";

const WebRTC = {
  mounted() {
    this.peers = {};
    this.localStream = null;
    this.roomId = this.el.dataset.roomId;
    this.userId = this.el.dataset.userId;
    this.iceCandidateBuffer = {};

    console.log("WebRTC hook mounted");

    this.handleEvent("joined_room", ({ users }) => {
      console.log("Received joined_room event with users:", users);
      this.initializeWebRTC(users);
    });

    this.handleEvent("user_joined", ({ user_id }) => {
      console.log("Received user_joined event for user:", user_id);
      if (user_id !== this.userId) {
        this.connectToPeer(user_id, false); // Existing users wait for offers
      }
    });

    this.handleEvent("user_left", ({ user_id }) => {
      if (user_id === this.userId) {
        console.log("Current user left:", user_id);
        this.destroyed();
      } else {
        console.log("Received user_left event for user:", user_id);
        this.removePeer(user_id);
      }
    });

    this.handleEvent("webrtc_signal", (payload) => {
      console.log("Received webrtc_signal event:", payload);
      this.handleSignal(payload);
    });

    // Removed the 'ready_to_connect' event handler

    this.handleEvent("toggle_fullscreen", () => {
      this.toggleFullscreen();
    });

    this.viewingMode = "remote";

    // Get references to the video containers
    this.localVideoContainer = document.getElementById("local-video-container");
    this.remoteVideosContainer = document.getElementById("remote-videos");

    // Add click listener to local video container
    this.localVideoContainer.addEventListener("click", () =>
      this.toggleViewingMode()
    );

    // Create the switch-back button but don't add it yet
    this.createSwitchBackButton();

    window.addEventListener("resize", () => this.resizeVideos());

    this.chatMessages = this.el.querySelector("#chat-messages");
    this.messageTextarea = this.el.querySelector('#send_message');

    this.handleEvent("new_message", () => {
      if (this.isFullscreen || !this.isChatVisible()) {
        this.showMessageBanner();
      }
      this.scrollChatToBottom();
    });
  },

  addChatMessage(userId, message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    const isOwnMessage = userId === this.el.dataset.userId;
    messageElement.className = `p-2 rounded-lg ${isOwnMessage ? 'bg-blue-100 ml-auto' : 'bg-gray-100'} ${isOwnMessage ? 'text-right' : ''}`;
    messageElement.style.maxWidth = '80%';
    messageElement.innerHTML = `
      <span class="font-bold ${isOwnMessage ? 'text-blue-600' : 'text-gray-600'}">${isOwnMessage ? "You" : userId.slice(0, 5) + "..."}</span>:
      <span>${this.escapeHtml(message)}</span>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  scrollChatToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  isChatVisible() {
    const chatToggle = document.getElementById('chat-toggle');
    return window.innerWidth >= 768 || chatToggle.checked;
  },

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  // WebRTC methods

  initializeWebRTC(users) {
    console.log("Initializing WebRTC with users:", users);
    this.getLocalStream()
      .then(() => {
        console.log("Local stream obtained, connecting to peers");
        users.forEach((user_id) => {
          if (user_id !== this.userId) {
            this.connectToPeer(user_id, true); // New user creates offers
          }
        });
        // Removed the 'ready_to_connect' broadcast
      })
      .catch((error) => {
        console.error("Error getting local stream:", error);
      });
  },

  connectToPeer(peerId, createOffer = false) {
    console.log(`Connecting to peer ${peerId}`);
    if (this.peers[peerId]) {
      console.log(
        `Peer connection exists for ${peerId}. Closing and recreating.`
      );
      this.peers[peerId].close();
      delete this.peers[peerId];
    }
    const peer = this.createPeerConnection(peerId);
    this.peers[peerId] = peer;

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peer.addTrack(track, this.localStream);
      });
    }

    if (createOffer) {
      this.createOffer(peer, peerId);
    }
  },

  createPeerConnection(peerId) {
    console.log(`Creating peer connection for ${peerId}`);
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerId}`, event.candidate);
        this.pushEvent("webrtc_signal", {
          to: peerId,
          signal: { type: "ice_candidate", ice: event.candidate },
        });
      }
    };

    peer.ontrack = (event) => {
      console.log(`Received remote track from ${peerId}`, event.streams[0]);
      this.addRemoteStream(peerId, event.streams[0]);
    };

    peer.onconnectionstatechange = (event) => {
      console.log(
        `Connection state change for ${peerId}:`,
        peer.connectionState
      );
      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "closed"
      ) {
        console.log(
          `Connection to ${peerId} ${peer.connectionState}. Removing peer.`
        );
        this.removePeer(peerId);
      }
    };

    // Removed 'onnegotiationneeded' handler

    return peer;
  },

  createOffer(peer, peerId) {
    console.log(`Creating offer for ${peerId}`);
    peer
      .createOffer()
      .then((offer) => {
        console.log(`Setting local description for ${peerId}`);
        return peer.setLocalDescription(offer);
      })
      .then(() => {
        console.log(`Sending offer to ${peerId}`);
        this.pushEvent("webrtc_signal", {
          to: peerId,
          signal: { type: "offer", sdp: peer.localDescription },
        });
      })
      .catch((error) => console.error("Error creating offer:", error));
  },

  handleSignal(payload) {
    const { from, signal } = payload;
    console.log(`Received signal from ${from}:`, signal);

    let peer = this.peers[from];
    if (!peer) {
      console.log(`No existing peer for ${from}. Creating new connection.`);
      peer = this.createPeerConnection(from);
      this.peers[from] = peer;
    }

    switch (signal.type) {
      case "offer":
        console.log(`Handling offer from ${from}`);
        peer
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            console.log(`Creating answer for ${from}`);
            return peer.createAnswer();
          })
          .then((answer) => {
            console.log(`Setting local description (answer) for ${from}`);
            return peer.setLocalDescription(answer);
          })
          .then(() => {
            console.log(`Sending answer to ${from}`);
            this.pushEvent("webrtc_signal", {
              to: from,
              signal: { type: "answer", sdp: peer.localDescription },
            });
            this.addBufferedIceCandidates(from);
          })
          .catch((error) => console.error("Error handling offer:", error));
        break;
      case "answer":
        console.log(`Setting remote description (answer) for ${from}`);
        peer
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            this.addBufferedIceCandidates(from);
          })
          .catch((error) =>
            console.error("Error setting remote description:", error)
          );
        break;
      case "ice_candidate":
        if (peer.remoteDescription && peer.remoteDescription.type) {
          console.log(`Adding ICE candidate for ${from}`);
          peer
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch((error) =>
              console.error("Error adding ICE candidate:", error)
            );
        } else {
          console.log(`Buffering ICE candidate for ${from}`);
          if (!this.iceCandidateBuffer[from]) {
            this.iceCandidateBuffer[from] = [];
          }
          this.iceCandidateBuffer[from].push(signal.ice);
        }
        break;
    }
  },

  addBufferedIceCandidates(peerId) {
    const peer = this.peers[peerId];
    const bufferedCandidates = this.iceCandidateBuffer[peerId] || [];
    bufferedCandidates.forEach((candidate) => {
      console.log(`Adding buffered ICE candidate for ${peerId}`);
      peer
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((error) =>
          console.error("Error adding buffered ICE candidate:", error)
        );
    });
    // Clear the buffer
    this.iceCandidateBuffer[peerId] = [];
  },

  removePeer(peerId) {
    console.log(`Removing peer ${peerId}`);
    if (this.peers[peerId]) {
      this.peers[peerId].ontrack = null;
      this.peers[peerId].onremovetrack = null;
      this.peers[peerId].onremovestream = null;
      this.peers[peerId].onicecandidate = null;
      this.peers[peerId].oniceconnectionstatechange = null;
      this.peers[peerId].onsignalingstatechange = null;
      this.peers[peerId].onicegatheringstatechange = null;
      this.peers[peerId].onnegotiationneeded = null;

      this.peers[peerId].close();
      delete this.peers[peerId];
    }
    const remoteVideo = document.getElementById(`remote-video-${peerId}`);
    if (remoteVideo) {
      remoteVideo.srcObject = null;
    }
    delete this.iceCandidateBuffer[peerId];
  },

  toggleFullscreen() {
    const container = document.getElementById("video-container");
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    this.resizeVideos();
  },

  resizeVideos() {
    const remoteVideosContainer = document.getElementById("remote-videos");
    const remoteVideos = remoteVideosContainer.querySelectorAll(
      ".video-aspect-ratio"
    );
    const isFullscreen = !!document.fullscreenElement;

    if (isFullscreen) {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const videoCount = remoteVideos.length;

      let columns = Math.ceil(Math.sqrt(videoCount));
      let rows = Math.ceil(videoCount / columns);

      let videoWidth = Math.floor(containerWidth / columns);
      let videoHeight = Math.floor(containerHeight / rows);

      remoteVideos.forEach((videoContainer) => {
        videoContainer.style.width = `${videoWidth}px`;
        videoContainer.style.height = `${videoHeight}px`;
        videoContainer.style.padding = "0";
      });
    } else {
      remoteVideos.forEach((videoContainer) => {
        videoContainer.style.width = "";
        videoContainer.style.height = "";
        videoContainer.style.paddingBottom = "56.25%";
      });
    }
  },

  getLocalStream() {
    console.log("Requesting local stream");
    return navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log("Got local stream");
        this.localStream = stream;
        const localVideo = document.getElementById("local-video");
        localVideo.srcObject = stream;
        return stream;
      });
  },

  addRemoteStream(peerId, stream) {
    console.log(`Adding remote stream for ${peerId}`);
    let remoteVideo = document.getElementById(`remote-video-${peerId}`);
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      this.resizeVideos();
    } else {
      console.error(`Video element for peer ${peerId} not found`);
    }
  },

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  },

  toggleViewingMode() {
    if (this.viewingMode === "remote") {
      this.showLocalVideoFullScreen();
    } else {
      this.showRemoteVideos();
    }
  },

  // EMOJI PARTY

  emojis: ["🎉", "💥", "✨", "🔥", "🌟", "🎊", "🍾", "😃", "🥳", "😎", "🌈"],

  compliments: complimnets,

  emojisAroundCompliment: [],

  showRandomCompliment() {
    // Select a random compliment
    const compliment =
      this.compliments[Math.floor(Math.random() * this.compliments.length)];

    // Create the compliment container
    const complimentContainer = document.createElement("div");
    complimentContainer.className = "compliment-container";
    // Set styles for the compliment container
    complimentContainer.style.position = "fixed";
    complimentContainer.style.top = "50%";
    complimentContainer.style.left = "50%";
    complimentContainer.style.transform = "translate(-50%, -50%)";
    complimentContainer.style.zIndex = "100";
    complimentContainer.style.background = "rgba(0, 0, 0, 0.7)";
    complimentContainer.style.color = "white";
    complimentContainer.style.padding = "20px";
    complimentContainer.style.borderRadius = "10px";
    complimentContainer.style.display = "flex";
    complimentContainer.style.flexDirection = "column";
    complimentContainer.style.alignItems = "center";
    complimentContainer.style.fontSize = "24px";
    complimentContainer.style.textAlign = "center";

    // Compliment text
    const message = document.createElement("div");
    message.textContent = compliment.message;
    complimentContainer.appendChild(message);

    document.body.appendChild(complimentContainer);

    // Create emojis around the compliment
    this.createEmojisAroundCompliment(complimentContainer, compliment.emojis);

    // Adjust the duration to accommodate emoji appearance
    const numEmojis = 100;
    const totalDuration = 2000;
    const complimentDuration = totalDuration + 2000; // Extra time for explosion and viewing

    // Animate the compliment (fade in and out)
    complimentContainer.animate(
      [
        { opacity: 0 },
        { opacity: 1 },
        { opacity: 1, offset: 0.8 },
        { opacity: 0 },
      ],
      {
        duration: complimentDuration,
        easing: "ease-in-out",
      }
    ).onfinish = () => {
      complimentContainer.remove();
    };
  },

  createEmojisAroundCompliment(complimentContainer, emojis) {
    this.emojisAroundCompliment = []; // Store references to emoji elements
  
    const numEmojis = 99; // Total number of emojis
    const totalDuration = 2000; // Total time to add all emojis (in milliseconds)
    const delayBetweenEmojis = totalDuration / numEmojis;
  
    // Get the compliment container's bounding rectangle
    const rect = complimentContainer.getBoundingClientRect();
  
    // Define the larger rectangle around the compliment container
    const padding = 20; // Reduced padding to bring emojis closer
    const left = rect.left - padding;
    const right = rect.right + padding;
    const top = rect.top - padding;
    const bottom = rect.bottom + padding;
  
    // Calculate the width and height of the larger rectangle
    const width = right - left;
    const height = bottom - top;
  
    // Calculate the perimeter of the larger rectangle
    const perimeter = 2 * (width + height);
  
    for (let i = 0; i < numEmojis; i++) {
      setTimeout(() => {
        const emojiChar = emojis[i % emojis.length];
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji-around-compliment';
        emojiElement.textContent = emojiChar;
        emojiElement.style.position = 'fixed';
        emojiElement.style.zIndex = '99';
        emojiElement.style.fontSize = `${24 + Math.random() * 16}px`; // Random size between 24px and 40px
        emojiElement.style.pointerEvents = 'none';
        emojiElement.style.userSelect = 'none';
        emojiElement.style.opacity = '0';
  
        // Randomly pick a distance along the perimeter
        const distance = Math.random() * perimeter;
  
        let x, y;
  
        if (distance < width) {
          // Top edge
          x = left + distance;
          y = top;
        } else if (distance < width + height) {
          // Right edge
          x = right;
          y = top + (distance - width);
        } else if (distance < 2 * width + height) {
          // Bottom edge
          x = right - (distance - width - height);
          y = bottom;
        } else {
          // Left edge
          x = left;
          y = bottom - (distance - 2 * width - height);
        }
  
        // Add slight random offset to avoid perfect alignment
        const offset = 5; // Reduced offset to keep emojis closer
        x += (Math.random() - 0.5) * offset * 2;
        y += (Math.random() - 0.5) * offset * 2;
  
        // Position the emoji
        emojiElement.style.left = `${x}px`;
        emojiElement.style.top = `${y}px`;
        emojiElement.style.transform = 'translate(-50%, -50%)';
  
        document.body.appendChild(emojiElement);
        this.emojisAroundCompliment.push(emojiElement);
  
        // Fade in the emoji
        emojiElement.animate(
          [
            { opacity: 0 },
            { opacity: 1 }
          ],
          {
            duration: 300,
            easing: 'ease-in',
            fill: 'forwards' // Retain the final state
          }
        );
      }, i * delayBetweenEmojis);
    }
  
    // After all emojis have been added, trigger the explosion
    const totalAnimationTime = numEmojis * delayBetweenEmojis;
    setTimeout(() => {
      this.explodeEmojis();
    }, totalAnimationTime + 500); // Add a slight delay before explosion
  },

  explodeEmojis() {
    // Animate each emoji to move outward and fade out
    this.emojisAroundCompliment.forEach((emojiElement) => {
      const rect = emojiElement.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
  
      // Calculate the angle from the center of the screen to the emoji
      const angle = Math.atan2(startY - window.innerHeight / 2, startX - window.innerWidth / 2);
  
      // Randomize explosion distance
      const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 0.8;
      const minDistance = maxDistance * 0.5; // Minimum distance is 50% of max
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
  
      // Calculate end positions with random distance
      const endX = startX + Math.cos(angle) * distance;
      const endY = startY + Math.sin(angle) * distance;
  
      // Randomize animation duration for explosion speed
      const minDuration = 800; // Minimum duration in ms
      const maxDuration = 1500; // Maximum duration in ms
      const duration = minDuration + Math.random() * (maxDuration - minDuration);
  
      const animation = emojiElement.animate([
        {
          transform: `translate(-50%, -50%)`,
          opacity: 1,
        },
        {
          transform: `translate(${endX - startX}px, ${endY - startY}px)`,
          opacity: 0,
        }
      ], {
        duration: duration,
        easing: 'ease-out',
      });
  
      animation.onfinish = () => {
        emojiElement.remove();
      };
    });
  
    // Clear the array after animation
    this.emojisAroundCompliment = [];
  },

  showLocalVideoFullScreen() {
    this.viewingMode = "local";

    // Add 'fullscreen' class to local video container
    this.localVideoContainer.classList.add("fullscreen");
    // Hide remote videos
    this.remoteVideosContainer.classList.add("hidden");
    // Add switch-back button
    this.localVideoContainer.appendChild(this.switchBackButton);

    // Remove cursor pointer
    this.localVideoContainer.classList.remove("cursor-pointer");

    this.showRandomCompliment();
  },

  showRemoteVideos() {
    this.viewingMode = "remote";

    // Remove 'fullscreen' class from local video container
    this.localVideoContainer.classList.remove("fullscreen");
    // Show remote videos
    this.remoteVideosContainer.classList.remove("hidden");
    // Remove switch-back button
    this.switchBackButton.remove();

    // Add cursor pointer back
    this.localVideoContainer.classList.add("cursor-pointer");
  },

  createSwitchBackButton() {
    // Create a button to switch back to remote view
    this.switchBackButton = document.createElement("button");
    this.switchBackButton.className =
      "absolute top-4 left-4 z-10 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg";
    this.switchBackButton.title = "Switch to Remote View";

    // Add icon inside the button (replace with your icon)
    this.switchBackButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
        stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M15 12H9m0 0l3 3m-3-3l3-3" />
      </svg>
    `;

    // Add click listener to the switch-back button
    this.switchBackButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent click from propagating to the local video container
      this.toggleViewingMode();
    });
  },
  destroyed() {
    console.log("WebRTC hook destroyed");
    this.stopLocalStream();
    Object.keys(this.peers).forEach((peerId) => this.removePeer(peerId));
    this.peers = {};
    this.iceCandidateBuffer = {};
    this.localVideoContainer.removeEventListener(
      "click",
      this.toggleViewingMode
    );
    this.switchBackButton.removeEventListener("click", this.toggleViewingMode);
  },
};

export default WebRTC;
