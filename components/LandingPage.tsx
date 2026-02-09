
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div>
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-32 max-w-6xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-stone-900 mb-8 leading-[1.1]">
          The most <span className="italic serif text-amber-600">meaningful</span> gift <br />
          doesn’t come in a box.
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-12 leading-relaxed">
          MemoryLoom helps you create beautiful group tribute videos for the people who matter most. 
          We handle the logistics, you share the love.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onStart}
            className="bg-amber-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            Start a Project
          </button>
          <button className="bg-white border border-stone-200 text-stone-800 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-stone-50 transition-all">
            See an Example
          </button>
        </div>
      </section>

      {/* Social Proof / How it works simple */}
      <section className="bg-stone-100 py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">1</div>
            <h3 className="text-xl font-bold">Invite Friends</h3>
            <p className="text-stone-600">Send a magic link to family, colleagues, or friends. No app download required.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">2</div>
            <h3 className="text-xl font-bold">Collect Memories</h3>
            <p className="text-stone-600">They record a short message or upload photos directly from their phone.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">3</div>
            <h3 className="text-xl font-bold">AI Does the Rest</h3>
            <p className="text-stone-600">Our intelligent editor weaves clips together with music and transitions.</p>
          </div>
        </div>
      </section>

      {/* Emotional Quote */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center">
        <div className="text-stone-300 text-6xl mb-6">“</div>
        <blockquote className="text-3xl italic serif text-stone-800 leading-snug">
          I made a MemoryLoom for my dad's 70th. Seeing 40 of his old friends and students share how he changed their lives... he cried, I cried, it was the best gift we've ever given.
        </blockquote>
        <p className="mt-8 font-medium text-stone-500">— Sarah J., Organizer</p>
      </section>

      {/* CTA */}
      <section className="bg-stone-900 text-white py-24 px-6 text-center">
        <h2 className="text-4xl font-bold mb-8">Ready to celebrate someone?</h2>
        <button 
          onClick={onStart}
          className="bg-amber-500 text-white px-10 py-5 rounded-full text-xl font-bold hover:bg-amber-600 transition-all hover:scale-105"
        >
          Create a Tribute Today
        </button>
      </section>
    </div>
  );
};

export default LandingPage;
