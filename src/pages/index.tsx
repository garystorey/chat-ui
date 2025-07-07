import { Chat } from "../features";
import ChatList from "../features/ChatList";

export default async function HomePage() {
  return (
    <>
      <Chat />
      <ChatList />
    </>
  );
}
