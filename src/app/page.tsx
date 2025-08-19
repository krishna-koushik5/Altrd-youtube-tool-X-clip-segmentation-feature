"use client";

import YouTubeClipper from "@/components/YouTubeClipper";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import SavedClips from "@/components/SavedClips";

// Define the SavedClip interface
export interface SavedClip {
  id: string;
  videoId: string;
  title: string;
  start: number;
  end: number;
  thumbnail: string;
  originalUrl: string;
  createdAt: Date;
  captions?: Array<{
    start: string;
    end: string;
    text: string;
  }>;
  // scheduleTime?: Date;
}

export default function Home() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"clipper" | "saved" | "save">("clipper");
  const [savedClips, setSavedClips] = useState<SavedClip[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});

  const handleSaveClip = (clip: SavedClip) => {
    setSavedClips(prev => [...prev, clip]);
  };

  const handleUpdateClip = (clipId: string, updatedData: Partial<SavedClip>) => {
    setSavedClips(prev =>
      prev.map(clip =>
        clip.id === clipId ? { ...clip, ...updatedData } : clip
      )
    );
  };

  const handleSwitchToSaveClips = () => {
    setActiveTab("save");
    // Optional: Add a subtle notification that user was redirected
    setTimeout(() => {
      console.log("Redirected to Save Clips tab after successful video generation");
    }, 100);
  };

  const handleVideoGenerated = (clipId: string, videoUrl: string) => {
    setGeneratedVideos(prev => ({
      ...prev,
      [clipId]: videoUrl,
    }));
  };

  // Get clips that have generated videos
  const clipsWithVideos = savedClips.filter(clip => 
    Object.keys(generatedVideos).includes(clip.id)
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-black dark:text-white flex">
      {/* Vertical Sidebar Navigation */}
      <div className="w-64 bg-gray-50 dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-[#333333] flex flex-col">
        {/* Header section in sidebar */}
        <header className="p-4 border-b border-gray-200 dark:border-[#333333]">
          <div className="flex items-center">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/922/922672.png" 
              alt="YouTube Clipper"
              className="h-8 w-8 mr-2"
            />
            <h1 className="text-lg font-bold">YouTube Clipper</h1>
          </div>
        </header>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4">
          <button
            onClick={() => setActiveTab("clipper")}
            className={`w-full px-4 py-3 text-left font-medium text-sm flex items-center hover:bg-gray-100 dark:hover:bg-[#252525] ${
              activeTab === "clipper"
                ? "bg-[#7C3AED]/10 text-[#7C3AED] border-r-2 border-[#7C3AED]"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            YouTube Clipper
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`w-full px-4 py-3 text-left font-medium text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#252525] ${
              activeTab === "saved"
                ? "bg-[#7C3AED]/10 text-[#7C3AED] border-r-2 border-[#7C3AED]"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <span>Editor</span>
            <span className="text-xs bg-gray-200 dark:bg-[#333333] px-2 py-1 rounded">{savedClips.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("save")}
            className={`w-full px-4 py-3 text-left font-medium text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#252525] ${
              activeTab === "save"
                ? "bg-[#7C3AED]/10 text-[#7C3AED] border-r-2 border-[#7C3AED]"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <span>Generated Videos</span>
            <span className="text-xs bg-gray-200 dark:bg-[#333333] px-2 py-1 rounded">{clipsWithVideos.length}</span>
          </button>
        </nav>

        {/* Theme Toggle */}
        <div className="p-4">
          <ThemeToggle />
        </div>

        {/* Branding Footer - Fixed to bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-[#333333]">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            built with ❤️ by altrd
          </p>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
        {/* Active tab content */}
        {activeTab === "clipper" ? (
          <div className="space-y-6">
            {!videoLoaded && (
              <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-6 text-center">
                <h2 className="text-3xl font-bold mb-2">
                  Build, share and <span className="text-[#7C3AED]">monetize</span> YouTube Content
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
                  Automated clip generation, shareable links and scheduling for creators.
                </p>
              </div>
            )}
            <YouTubeClipper 
              onVideoLoad={() => setVideoLoaded(true)} 
              onSaveClip={handleSaveClip} 
            />
          </div>
        ) : activeTab === "saved" ? (
          <SavedClips
            clips={savedClips}
            onRemoveClip={(id) => {
            setSavedClips(prev => prev.filter(clip => clip.id !== id));
            }}
            onUpdateClip={handleUpdateClip}
            onSwitchToSaveClips={handleSwitchToSaveClips}
            onVideoGenerated={handleVideoGenerated}
          />
        ) : (
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Generated Videos</h2>
            {clipsWithVideos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
                  No generated videos yet. Go to &ldquo;My Clips&rdquo; to generate videos from your saved clips.
                </p>
                <Button 
                  onClick={() => setActiveTab("saved")}
                  className="bg-[#7C3AED] text-white hover:bg-[#6B21A8]"
                >
                  Go to My Clips
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clipsWithVideos.map((clip) => (
                  <div key={clip.id} className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 border border-gray-200 dark:border-[#333333]">
                    <h3 className="font-semibold mb-2">{clip.title}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                      <p>Duration: {Math.round(clip.end - clip.start)}s</p>
                      <p>Captions: {clip.captions?.length || 0} segments</p>
                      <p className="text-green-600 dark:text-green-400">✅ Includes title, captions & credits</p>
                    </div>
                    
                    {generatedVideos[clip.id] && (
                      <div className="space-y-4">
                        <video 
                          src={generatedVideos[clip.id]} 
                          controls 
                          className="w-full rounded-lg"
                          style={{ aspectRatio: "9/16", maxHeight: "300px" }}
                        />
                        <div className="flex gap-2">
                          <Button
                            asChild
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <a 
                              href={generatedVideos[clip.id]} 
                              download={`${clip.title}.mp4`}
                            >
                              Download Video
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}${generatedVideos[clip.id]}`);
                              // You could add a toast here for feedback
                            }}
                          >
                            Copy Link
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Video includes burned-in captions, titles, and credits as configured.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
