const USER_AGENT =
  process.env.APP_USER_AGENT ||
  "CineTrack/1.0 (https://github.com/cinetrack; cinetrack@local.dev)";

const externalHeaders = () => ({
  "User-Agent": USER_AGENT,
  Accept: "application/json",
});

module.exports = { USER_AGENT, externalHeaders };
