import { ChatStore } from "../store";

const store = new ChatStore();

export const GET = async (_request: Request): Promise<Response> => {
  const messages = store.getAll();
  return Response.json(messages, { status: 200 });
};

export const POST = async (request: Request): Promise<Response> => {
  const msg = await request.json();
  store.save(msg);
  return Response.json({ success: true }, { status: 201 });
};
