import React, { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useGame } from "../../context/GameContext";
import { API_URL } from "../../config";

type FeedbackModalProps = {
  onClose: () => void;
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { user } = useAuth();
  const { gameState } = useGame();

  const handleSubmit = async () => {
  try {
    if (!rating) return;

    setLoading(true);

    const res = await fetch(`${API_URL}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rating,
        message,
        roomId: gameState?.roomId,
        userId: user?.id,
        username: user?.username
      })
    });

    if (!res.ok) throw new Error("Failed");

    localStorage.setItem("memegame_feedback_state", "submitted");

    setSubmitted(true);

    setTimeout(() => {
      onClose();
    }, 1800);

  } catch (err) {
    console.error("Feedback error:", err);
  } finally {
    setLoading(false);
  }
};

  const handleDecline = () => {
    localStorage.setItem("memegame_feedback_state", "declined");
    onClose();
  };

  const handleRemindLater = () => {
    const played = Number(localStorage.getItem("memegame_games_played") || 0);
    localStorage.setItem("memegame_feedback_state", "remind_later");
    localStorage.setItem("memegame_feedback_next_trigger", (played + 3).toString());
    onClose();
  };

  if (submitted) {
  return (
    <div className="fixed inset-0 bg-[#131010]/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border-2 border-[#131010] shadow-[6px_6px_0px_0px_#131010] p-8 text-center">

        <h2 className="text-2xl font-black text-[#131010] mb-3">
          Thanks for the feedback!
        </h2>

        <p className="text-[#131010]/70 font-medium">
          Your input helps improve MemeGame.
        </p>

      </div>
    </div>
  );
}

  return (
    <div className="fixed inset-0 bg-[#131010]/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border-2 border-[#131010] shadow-[6px_6px_0px_0px_#131010] p-6">

        <h2 className="text-xl font-black text-[#131010] mb-2">
          How was MemeGame?
        </h2>

        <p className="text-sm text-[#131010]/60 mb-5">
          Your feedback helps improve the game.
        </p>

        <div className="flex gap-2 mb-5">
          {[1,2,3,4,5].map((star)=>(
            <button
              key={star}
              onClick={()=>setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={28}
                strokeWidth={2.5}
                className={
                  star <= rating
                    ? "text-[#D98324] fill-[#D98324]"
                    : "text-[#131010]/30"
                }
              />
            </button>
          ))}
        </div>

       <textarea
          placeholder="Optional message..."
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
          className="w-full border-2 border-[#131010] rounded-lg p-3 text-base sm:text-sm text-[#131010] placeholder:text-[#131010]/40 mb-5 resize-none"
          rows={3}
        />

        <div className="flex flex-col gap-2">
         <button
            onClick={handleSubmit}
            disabled={!rating || loading}
            className={`border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] rounded-lg py-2 font-bold text-base sm:text-sm
            ${rating ? "bg-[#5F8B4C] text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
          >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>

        <button
          onClick={handleRemindLater}
          className="bg-white text-[#131010] border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-lg py-2 font-bold text-base sm:text-sm"
        >
          Remind me later
        </button>

          <button
            onClick={handleDecline}
            className="text-sm text-[#131010]/60"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;