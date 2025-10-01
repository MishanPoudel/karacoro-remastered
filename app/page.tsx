"use client";

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Music, Users, Mic, Star, Play, Volume2, Crown, Zap, Shield, Globe, Heart, Sparkles } from "lucide-react";
import { RoomCreator } from "@/components/room/RoomCreator";
import { RoomJoiner } from "@/components/room/RoomJoiner";
import { trackPageView, trackKaraokeEvent } from '@/lib/analytics';

export default function Home() {
  useEffect(() => {
    trackPageView('home');
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const targetPosition = element.offsetTop - 80; // Account for any fixed header
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1200; // 1.2 second smooth animation
      let start = 0;

      const animation = (currentTime: number) => {
        if (start === 0) start = currentTime;
        const timeElapsed = currentTime - start;
        const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
      };

      // Enhanced easing function for smoother animation
      const easeInOutCubic = (t: number, b: number, c: number, d: number) => {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
      };

      requestAnimationFrame(animation);
    }
  };

  const handleGetStarted = () => {
    trackKaraokeEvent('get_started_clicked');
    scrollToSection('room-section');
  };

  const handleHowItWorks = () => {
    trackKaraokeEvent('how_it_works_clicked');
    scrollToSection('how-it-works');
  };

  const handleCTAClick = () => {
    trackKaraokeEvent('cta_start_karaoke_clicked');
    scrollToSection('room-section');
  };

  const features = [
    {
      icon: Users,
      title: "Real-time Sync",
      description: "Everyone watches and sings along in perfect sync, no matter where they are in the world.",
      color: "text-red-400"
    },
    {
      icon: Music,
      title: "YouTube Integration",
      description: "Access millions of songs directly from YouTube. Search and add any video to your karaoke queue.",
      color: "text-red-400"
    },
    {
      icon: Crown,
      title: "Smart Room Management",
      description: "Create private rooms with simple 6-character codes. Host controls playback and manages the experience.",
      color: "text-yellow-400"
    },
    {
      icon: Volume2,
      title: "Voice Chat",
      description: "Built-in voice communication lets you cheer each other on and chat between songs.",
      color: "text-blue-400"
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "No downloads, no accounts required. Just create a room and start singing within seconds.",
      color: "text-green-400"
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your karaoke sessions are private. Only people with your room code can join.",
      color: "text-purple-400"
    }
  ];

  const stats = [
    { number: "10K+", label: "Songs Sung", icon: Music },
    { number: "500+", label: "Active Rooms", icon: Users },
    { number: "50+", label: "Countries", icon: Globe },
    { number: "99%", label: "Uptime", icon: Shield }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Music Teacher",
      content: "KaraCoro has revolutionized how I conduct virtual music classes. The sync is perfect!",
      rating: 5
    },
    {
      name: "Mike R.",
      role: "Party Host",
      content: "Best karaoke app ever! We use it for all our virtual parties. Everyone loves it.",
      rating: 5
    },
    {
      name: "Lisa K.",
      role: "Remote Team Lead",
      content: "Great for team building! Our remote team bonding sessions are so much fun now.",
      rating: 5
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 text-white overflow-x-hidden scrollbar-hide">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-red-500/20">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-2xl font-bold">KaraCoro</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={handleHowItWorks}
                className="text-gray-300 hover:text-white transition-colors"
              >
                How it Works
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Features
              </button>
              <Button 
                onClick={handleGetStarted}
                className="bg-red-500 hover:bg-red-600"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 bg-gradient-to-b from-black via-red-900/20 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="container relative z-10 mx-auto text-center max-w-6xl py-20">
          <Badge className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border-red-500/30 mb-6 sm:mb-8 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium backdrop-blur-sm inline-flex items-center">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            The Future of Online Karaoke
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-white to-red-200 bg-clip-text text-transparent">
              Sing Together,
            </span>
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                Anywhere
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-8 sm:mb-12 text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
            Create magical karaoke moments with friends across the globe. Real-time sync, crystal-clear voice chat, and millions of songs at your fingertips.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 md:mb-20 px-4 max-w-lg mx-auto sm:max-w-none">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 w-full sm:w-auto border-0"
              onClick={handleGetStarted}
            >
              <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              Start Singing Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto transition-all duration-300 w-full sm:w-auto backdrop-blur-sm"
              onClick={handleHowItWorks}
            >
              <Volume2 className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              See How It Works
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto px-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="flex flex-col items-center mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl mb-2 sm:mb-3 backdrop-blur-sm border border-red-500/20">
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-400" />
                  </div>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{stat.number}</span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Creation/Joining Section */}
      <section id="room-section" className="min-h-screen flex items-center py-16 sm:py-20 bg-gradient-to-b from-black via-gray-900/50 to-black backdrop-blur-sm px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10 w-full">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-white to-red-200 bg-clip-text text-transparent px-4">
              Start Your <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Karaoke Session</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
              Create a private room or join an existing one. It takes less than 30 seconds to get started.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-red-500/20 rounded-2xl p-1 hover:border-red-500/40 transition-colors">
              <RoomCreator />
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-red-500/20 rounded-2xl p-1 hover:border-red-500/40 transition-colors">
              <RoomJoiner />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="min-h-screen flex items-center py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-black via-red-900/10 to-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="container mx-auto max-w-7xl relative z-10 w-full">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-white to-red-200 bg-clip-text text-transparent px-4">
              Why Choose <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">KaraCoro</span>?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
              We&apos;ve built the most advanced online karaoke platform with features that make singing together feel natural and fun.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-5 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-red-500/20 hover:border-red-500/40 transition-all duration-300 group backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <feature.icon className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ${feature.color} mb-3 sm:mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300`} />
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-2 sm:mb-3 lg:mb-4 text-white">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="min-h-screen flex items-center py-16 sm:py-20 bg-gradient-to-b from-black via-gray-900/50 to-black backdrop-blur-sm px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10 w-full">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-white to-red-200 bg-clip-text text-transparent px-4">
              How It <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
              Getting started with KaraCoro is incredibly simple. Follow these three easy steps.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              {[
                {
                  step: "1",
                  title: "Create or Join",
                  description: "Create a new room or join an existing one with a 6-character room code. Share the code with friends.",
                  icon: Users
                },
                {
                  step: "2", 
                  title: "Add Songs",
                  description: "Search for your favorite karaoke songs on YouTube and add them to the queue. Everyone can contribute!",
                  icon: Music
                },
                {
                  step: "3",
                  title: "Sing Together",
                  description: "Take turns singing while everyone watches in perfect sync. Chat, cheer, and have amazing fun!",
                  icon: Mic
                }
              ].map((item, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-6 sm:mb-8">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl shadow-red-500/30">
                      {item.step}
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl w-fit mx-auto backdrop-blur-sm border border-red-500/20">
                      <item.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-red-400" />
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white px-4">{item.title}</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed px-4">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="min-h-screen flex items-center py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-black via-red-900/10 to-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10 w-full">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-white to-red-200 bg-clip-text text-transparent px-4">
              What People <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Say</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
              Join thousands of happy singers who&apos;ve made KaraCoro their go-to karaoke platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-5 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-red-500/20 hover:border-red-500/40 transition-all duration-300 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="flex items-center mb-3 sm:mb-4 lg:mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-3 sm:mb-4 lg:mb-6 italic text-sm sm:text-base lg:text-lg leading-relaxed">&quot;{testimonial.content}&quot;</p>
                  <div>
                    <p className="font-semibold text-white text-sm sm:text-base lg:text-lg">{testimonial.name}</p>
                    <p className="text-xs sm:text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="min-h-screen flex items-center py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="container px-4 sm:px-6 mx-auto text-center max-w-4xl relative z-10">
          <Heart className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white mx-auto mb-6 sm:mb-8 drop-shadow-lg" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 lg:mb-8 text-white drop-shadow-lg px-4">
            Ready to Create <span className="text-red-200">Musical Magic</span>?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-red-100 mb-8 sm:mb-10 lg:mb-12 leading-relaxed max-w-3xl mx-auto px-4 drop-shadow">
            Join the KaraCoro community today. It&apos;s completely free, works in any browser, and brings people together through the power of music.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 max-w-lg mx-auto sm:max-w-none">
            <Button 
              size="lg" 
              className="bg-white text-red-600 hover:bg-gray-100 hover:scale-105 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto shadow-2xl hover:shadow-3xl transition-all duration-300 w-full sm:w-auto font-semibold"
              onClick={handleCTAClick}
            >
              Start Your Karaoke Party
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/50 bg-white/10 text-white hover:bg-white hover:text-red-600 hover:scale-105 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto transition-all duration-300 w-full sm:w-auto backdrop-blur-sm font-semibold"
              onClick={handleHowItWorks}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-black">
        <div className="container px-4 sm:px-6 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold">KaraCoro</span>
            </div>
            <div className="flex items-center gap-6 text-xs sm:text-sm text-gray-400 text-center">
              <span>© 2025 KaraCoro. Made with ❤️ for music lovers.</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}