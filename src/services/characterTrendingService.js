const User = require("../models/User");

const aggregateCharacterField = (users, field) => {
  const counts = new Map();

  for (const user of users) {
    for (const c of user[field] || []) {
      const name = c.name?.trim();
      if (!name) continue;
      const source = (c.source || "").trim();
      const key = `${name.toLowerCase()}|${source.toLowerCase()}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { name, source, count: 1 });
      }
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
};

const getTrendingCharacters = async (limit = 12) => {
  const users = await User.find({})
    .select("favoriteCharacters ganduCharacters")
    .lean();

  return {
    favorite: aggregateCharacterField(users, "favoriteCharacters").slice(0, limit),
    gandu: aggregateCharacterField(users, "ganduCharacters").slice(0, limit),
  };
};

module.exports = { getTrendingCharacters, aggregateCharacterField };
