import { ChatStore } from "../../store";

const store = new ChatStore();

export const GET = async (): Promise<Response> => {
  const messages = store.getAll();
  return Response.json(messages, { status: 200 });
};

export const POST = async (request: Request): Promise<Response> => {
  const [msg, msg2] = await request.json();
  store.save(msg);
  store.save(msg2);
  return Response.json({ success: true }, { status: 200 });
};
