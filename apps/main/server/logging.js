function createLogger(enableLogging) {
  function write(level, message, data) {
    if (!enableLogging && level === 'info') return;

    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [ProxyServer]`;
    if (data) {
      console.log(prefix, message, JSON.stringify(data));
      return;
    }

    console.log(prefix, message);
  }

  return {
    info(message, data) {
      write('info', message, data);
    },
    error(message, data) {
      write('error', message, data);
    },
  };
}

module.exports = {
  createLogger,
};
