const ChatBox = {
  mounted() {
    this.chatMessages = this.el.querySelector("#chat-messages");
    this.messageTextarea = this.el.querySelector("#send_message");
    this.messageBanner = this.el.querySelector("#message-banner");

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
    messageElement.className = `p-2 rounded-lg ${
      isOwnMessage ? "bg-blue-100 ml-auto" : "bg-gray-100"
    } ${isOwnMessage ? "text-right" : ""}`;
    messageElement.style.maxWidth = "80%";
    messageElement.innerHTML = `
          <span class="font-bold ${
            isOwnMessage ? "text-blue-600" : "text-gray-600"
          }">${isOwnMessage ? "You" : userId.slice(0, 5) + "..."}</span>:
          <span>${this.escapeHtml(message)}</span>
        `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  showMessageBanner() {
    this.messageBanner.classList.remove("hidden");

    console.log(this, this.chatMessages);

    this.messageBanner.innerHTML = this.chatMessages.children.last().innerHTML;

    // Automatically hide the banner after 5 seconds
    setTimeout(() => {
      this.hideBanner();
    }, 5000);
  },

  hideBanner() {
    this.messageBanner.classList.add("hidden");
  },

  scrollChatToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  isChatVisible() {
    const chatToggle = document.getElementById("chat-toggle");
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
};
