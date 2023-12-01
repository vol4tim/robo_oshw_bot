import path from "path";
import config from "../config.json";

export const PATH_DB = path.join(__dirname, "/../files/database.sqlite");
export const PATH_SESSION_DB = path.join(__dirname, "/../files/session.sqlite");

export { config };
