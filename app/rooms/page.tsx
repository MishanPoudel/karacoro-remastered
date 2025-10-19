import MarqueeBanner from "@/components/MarqueeBanner";
import { RoomCreator } from "@/components/room/RoomCreator";
import { RoomJoiner } from "@/components/room/RoomJoiner";

export default function Home() {

  return (
    <main className="min-h-full bg-gradient-to-br from-red-900 via-black to-red-900 text-white overflow-hidden">
      <MarqueeBanner/>
      <section id="room-section" className="py-20 bg-black/40 backdrop-blur-sm min-h-screen flex justify-center items-center">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Your <span className="text-red-500">Karaoke Session</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Create a private room or join an existing one. It takes less than 30 seconds to get started.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <RoomCreator />
            <RoomJoiner />
          </div>
        </div>
      </section>

    </main>
  );
}