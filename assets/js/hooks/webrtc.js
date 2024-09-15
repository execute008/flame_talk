const WebRTC = {
    mounted() {
      this.peers = {};
      this.localStream = null;
      this.roomId = this.el.dataset.roomId;
      this.userId = this.el.dataset.userId;
  
      console.log("WebRTC hook mounted");
  
      this.handleEvent("joined_room", ({ users }) => {
        console.log("Received joined_room event with users:", users);
        this.initializeWebRTC(users);
      });
  
      this.handleEvent("user_joined", ({ user_id }) => {
        console.log("Received user_joined event for user:", user_id);
        if (user_id !== this.userId) {
          this.connectToPeer(user_id);
        }
      });
  
      this.handleEvent("user_left", ({ user_id }) => {
        console.log("Received user_left event for user:", user_id);
        this.removePeer(user_id);
      });
  
      this.handleEvent("webrtc_signal", (payload) => {
        console.log("Received webrtc_signal event:", payload);
        this.handleSignal(payload);
      });
  
      this.handleEvent("toggle_fullscreen", () => {
        this.toggleFullscreen();
      });
  
      window.addEventListener('resize', () => this.resizeVideos());
    },
  
    initializeWebRTC(users) {
      console.log("Initializing WebRTC");
      this.getLocalStream()
        .then(() => {
          console.log("Local stream obtained, connecting to peers");
          users.forEach(user_id => {
            if (user_id !== this.userId) {
              this.connectToPeer(user_id);
            }
          });
          this.pushEvent("ready_to_connect", {});
        })
        .catch((error) => {
          console.error("Error getting local stream:", error);
        });
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
  
    connectToPeer(peerId) {
      console.log(`Connecting to peer ${peerId}`);
      if (this.peers[peerId]) {
        console.log(`Already connected to peer ${peerId}`);
        return;
      }
      const peer = this.createPeerConnection(peerId);
      this.peers[peerId] = peer;
  
      this.localStream.getTracks().forEach(track => {
        peer.addTrack(track, this.localStream);
      });
  
      this.createOffer(peer, peerId);
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
        if (peer.connectionState === "failed") {
          console.log(
            `Connection to ${peerId} failed. Attempting to reconnect...`
          );
          this.removePeer(peerId);
          this.connectToPeer(peerId);
        }
      };
  
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
  
      if (!this.peers[from]) {
        console.log(`Creating new peer connection for ${from}`);
        this.connectToPeer(from);
      }
  
      const peer = this.peers[from];
  
      switch (signal.type) {
        case "offer":
          console.log(`Setting remote description (offer) for ${from}`);
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
            })
            .catch((error) => console.error("Error handling offer:", error));
          break;
        case "answer":
          console.log(`Setting remote description (answer) for ${from}`);
          peer
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .catch((error) =>
              console.error("Error setting remote description:", error)
            );
          break;
        case "ice_candidate":
          console.log(`Adding ICE candidate for ${from}`);
          peer
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch((error) =>
              console.error("Error adding ICE candidate:", error)
            );
          break;
      }
    },
  
    removePeer(peerId) {
      console.log(`Removing peer ${peerId}`);
      if (this.peers[peerId]) {
        this.peers[peerId].close();
        delete this.peers[peerId];
      }
      const remoteVideo = document.getElementById(`remote-video-${peerId}`);
      if (remoteVideo) {
        remoteVideo.srcObject = null;
      }
    },
  
    toggleFullscreen() {
      const container = document.getElementById('video-container');
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
      const remoteVideosContainer = document.getElementById('remote-videos');
      const remoteVideos = remoteVideosContainer.querySelectorAll('.video-aspect-ratio');
      const isFullscreen = !!document.fullscreenElement;
  
      if (isFullscreen) {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        const videoCount = remoteVideos.length;
  
        let columns = Math.ceil(Math.sqrt(videoCount));
        let rows = Math.ceil(videoCount / columns);
  
        let videoWidth = Math.floor(containerWidth / columns);
        let videoHeight = Math.floor(containerHeight / rows);
  
        remoteVideos.forEach(videoContainer => {
          videoContainer.style.width = `${videoWidth}px`;
          videoContainer.style.height = `${videoHeight}px`;
          videoContainer.style.padding = '0';
        });
      } else {
        remoteVideos.forEach(videoContainer => {
          videoContainer.style.width = '';
          videoContainer.style.height = '';
          videoContainer.style.paddingBottom = '56.25%';
        });
      }
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
  
    destroyed() {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }
      Object.values(this.peers).forEach((peer) => peer.close());
    },
  };
  
  export default WebRTC;