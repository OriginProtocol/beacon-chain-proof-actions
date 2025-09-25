  // Function for relative time formatting
  function timeAgo(value) {
    const date = new Date(value);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = Math.floor(seconds / 31536000); // years
    if (interval >= 1) return `${interval} year${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 2592000); // months
    if (interval >= 1) return `${interval} month${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 86400); // days
    if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 3600); // hours
    if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`;
    interval = Math.floor(seconds / 60); // minutes
    if (interval >= 1) return `${interval} minute${interval > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }

  module.exports = {
    timeAgo, 
  }