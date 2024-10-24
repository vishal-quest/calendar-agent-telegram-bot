class UtilService {
  isRefreshRequired(expiresIn) {
    const timeLeft = expiresIn - Date.now();

    if (timeLeft <= 0 || timeLeft < 3000) {
      return true;
    }

    return false;
  }
}

module.exports = UtilService;
