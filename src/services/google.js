const config = require("../config/config");

class GoogleService {
  async getAccessToken(code) {
    try {
      if (!code) {
        throw new Error("Missing code");
      }

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: config.GOOGLE_CLIENT_ID,
          client_secret: config.GOOGLE_CLIENT_SECRET,
          redirect_uri: config.SERVER_URL,
          grant_type: "authorization_code",
        }),
      });

      const json = await response.json();

      if (json.error) {
        throw json.error;
      }

      return {
        success: true,
        data: {
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresIn: json.expires_in * 1000,
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Unable to get access token",
      }
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error("No refresh token passed");
      }

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.GOOGLE_CLIENT_ID,
          client_secret: config.GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });


      const json = await response.json();

      if (json.error) {
        throw json.error;
      }

      return {
        success: true,
        data: {
          accessToken: json.access_token,
          expiresIn: json.expires_in * 1000,
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Unable to refresh access token",
      }
    }
  }

  async getEvents(accessToken, timeMin, timeMax) {
    try {
      if (!accessToken || !timeMin || !timeMax) {
        throw new Error("Missing required fields");
      }

      const queryParams = new URLSearchParams({
        orderBy: "startTime",
        showDeleted: false,
        singleEvents: true,
        timeMin,
        timeMax,
      });

      console.log(queryParams.toString());

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${queryParams.toString()}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        }
      });

      const json = await response.json();

      if (json.error) {
        throw json.error;
      }

      return {
        success: true,
        data: {
          events: json.items,
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Unable to get events",
      }
    }
  }
}

module.exports = GoogleService;
