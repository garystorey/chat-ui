import Database from "better-sqlite3";

export interface Message {
  id?: number;
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

export class ChatStore {
  private db: Database.Database;

  constructor(filePath: string = "./chat.db") {
    this.db = new Database(filePath);
    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS chat (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT,
          message TEXT,
          timestamp TEXT
        )
      `
      )
      .run();
  }

  save(msg: Message): void {
    this.db
      .prepare(`INSERT INTO chat (role, message, timestamp) VALUES (?, ?, ?)`)
      .run(msg.role, msg.message, msg.timestamp);
  }

  getRecentMessages(n = 6): Message[] {
    return (
      this.db
        .prepare(`SELECT * FROM chat ORDER BY id DESC LIMIT ?`)
        .all(n) as Message[]
    ).reverse();
  }

  getAll(): Message[] {
    return this.db
      .prepare(`SELECT * FROM chat ORDER BY id ASC`)
      .all() as Message[];
  }
}
