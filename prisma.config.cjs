require("dotenv").config();

module.exports = {
  datasource: {
    url: process.env.DATABASE_URL,
  },
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
};