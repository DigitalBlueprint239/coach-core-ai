import React, { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('/placeholder.png');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create responsive image URL
    const imageUrl = new URL(src, window.location.origin);
    if (width) imageUrl.searchParams.set('w', width.toString());
    if (height) imageUrl.searchParams.set('h', height.toString());
    imageUrl.searchParams.set('fm', 'webp');
    imageUrl.searchParams.set('q', '80');

    // Preload image
    const img = new window.Image();
    img.src = imageUrl.toString();
    img.onload = () => {
      setImageSrc(imageUrl.toString());
      setIsLoading(false);
    };
  }, [src, width, height]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
      />
    </div>
  );
};
