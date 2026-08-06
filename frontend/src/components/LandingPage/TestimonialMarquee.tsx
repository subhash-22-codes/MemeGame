import React from 'react';

const testimonials = [
  {
    text: "I haven't laughed this hard since 2016. My abs literally hurt.",
    author: "@MemeLord99",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=MemeLord99"
  },
  {
    text: "Perfect for our Friday night Discord calls. The community voting is brutal.",
    author: "Sarah J.",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=SarahJ"
  },
  {
    text: "My mom won a round and I'm still recovering. Never playing with her again.",
    author: "@GamerGuy_24",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=GamerGuy"
  },
  {
    text: "Better than Cards Against Humanity. There, I said it.",
    author: "Alex W.",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=AlexW"
  },
  {
    text: "I just got roasted by my own meme. 10/10 would cry again.",
    author: "@SadBoiHours",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=SadBoi"
  },
  {
    text: "We played this at the pre-game and missed the actual party.",
    author: "College Room 404",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=404"
  }
];

const TestimonialCard = ({ testimonial }: { testimonial: typeof testimonials[0] }) => (
  <div className="w-[260px] sm:w-[300px] flex-shrink-0 bg-white rounded-2xl p-5 sm:p-6 border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] sm:shadow-[6px_6px_0px_0px_#131010] mx-3 sm:mx-4 my-4 flex flex-col justify-between whitespace-normal min-h-[220px]">
    <p className="text-[#131010] font-medium text-base sm:text-lg leading-snug mb-6">"{testimonial.text}"</p>
    <div className="flex items-center gap-3 border-t-2 border-[#131010]/10 pt-4">
      <div className="w-10 h-10 bg-[#FFDDAB] rounded-full border-2 border-[#131010] flex items-center justify-center overflow-hidden">
        <img src={testimonial.avatar} alt={testimonial.author} className="w-full h-full object-cover" />
      </div>
      <p className="font-bold text-[#131010] font-poppins">{testimonial.author}</p>
    </div>
  </div>
);

const TestimonialMarquee: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFDDAB] border-b-4 border-[#131010] overflow-hidden">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#131010] font-poppins tracking-tight px-4">
          Don't just take our word for it
        </h2>
      </div>

      {/* Marquee Container */}
      <div className="relative flex overflow-x-hidden group">
        {/* Track 1 */}
        <div className="py-4 animate-marquee whitespace-nowrap flex items-stretch">
          {testimonials.map((t, i) => (
            <TestimonialCard key={`t1-${i}`} testimonial={t} />
          ))}
        </div>

        {/* Track 2 (Duplicate for infinite effect) */}
        <div className="absolute top-0 py-4 animate-marquee2 whitespace-nowrap flex items-stretch">
          {testimonials.map((t, i) => (
            <TestimonialCard key={`t2-${i}`} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialMarquee;
