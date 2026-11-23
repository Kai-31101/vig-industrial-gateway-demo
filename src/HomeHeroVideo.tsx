export function HomeHeroVideo({title}: {title: string}) {
  return (
    <div className="hero-video-player">
      <video
        src="/videos/vsip-hero.mp4"
        aria-label={title}
        autoPlay
        muted
        playsInline
        preload="metadata"
      />
    </div>
  );
}
