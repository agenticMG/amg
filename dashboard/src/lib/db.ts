import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: "require",
});

export default sql;
