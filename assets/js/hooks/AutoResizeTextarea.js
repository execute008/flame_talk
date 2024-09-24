const AutoResizeTextarea = {
    mounted() {
        this.resize = this.resize.bind(this);
        this.el.addEventListener('input', this.resize);
        this.el.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.resize();
      },
    
      resize() {
        this.el.style.height = 'auto';
        this.el.style.height = (this.el.scrollHeight) + 'px';
        
        // Limit to 5 rows
        const lineHeight = parseInt(window.getComputedStyle(this.el).lineHeight);
        const maxHeight = lineHeight * 5;
        if (this.el.scrollHeight > maxHeight) {
          this.el.style.height = maxHeight + 'px';
          this.el.style.overflowY = 'auto';
        } else {
          this.el.style.overflowY = 'hidden';
        }
      },
    
      handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.el.form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      },
    
      updated() {
        this.resize();
      }
  };