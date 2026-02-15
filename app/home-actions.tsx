"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateRoomModal } from "./create-room-modal";

export function HomeActions() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="home-actions-inline">
      <button
        className="button primary"
        type="button"
        onClick={() => setModalOpen(true)}
      >
        Create New Room
      </button>
      {modalOpen ? <CreateRoomModal open onClose={() => setModalOpen(false)} /> : null}

      <div className="join-inline">
        <input
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder="ROOM CODE"
          aria-label="Join room code"
        />
        <button
          className="button"
          type="button"
          onClick={() => {
            if (!roomCode.trim()) return;
            router.push(`/g/${roomCode.trim().toUpperCase()}`);
          }}
        >
          Join
        </button>
      </div>
    </div>
  );
}
