import React, { useState, useCallback } from 'react';
import { Box, Image, Skeleton, Text } from '@chakra-ui/react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  className?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  priority = false,
  quality = 85,
  placeholder = 'empty',
  className,
  fallback,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    if (fallback) {
      setCurrentSrc(fallback);
    }
    onError?.();
  }, [fallback, onError]);

  // Generate responsive image sources
  const generateSrcSet = (baseSrc: string) => {
    const baseName = baseSrc.replace(/\.[^/.]+$/, '');
    const extension = baseSrc.split('.').pop();
    
    return [
      `${baseName}-sm.${extension} 320w`,
      `${baseName}-md.${extension} 640w`,
      `${baseName}-lg.${extension} 1024w`,
      `${baseName}-xl.${extension} 1920w`,
    ].join(', ');
  };

  // Generate WebP and AVIF sources
  const generateModernSources = (baseSrc: string) => {
    const baseName = baseSrc.replace(/\.[^/.]+$/, '');
    const extension = baseSrc.split('.').pop();
    
    return [
      {
        type: 'image/avif',
        srcSet: generateSrcSet(baseName + '.avif'),
      },
      {
        type: 'image/webp',
        srcSet: generateSrcSet(baseName + '.webp'),
      },
      {
        type: `image/${extension}`,
        srcSet: generateSrcSet(baseSrc),
      },
    ];
  };

  if (hasError && !fallback) {
    return (
      <Box
        width={width}
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.100"
        borderRadius="md"
      >
        <Text color="gray.500" fontSize="sm">
          Image failed to load
        </Text>
      </Box>
    );
  }

  return (
    <Box position="relative" width={width} height={height}>
      {isLoading && (
        <Skeleton
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          borderRadius="md"
        />
      )}
      
      <picture>
        {generateModernSources(currentSrc).map((source, index) => (
          <source
            key={index}
            type={source.type}
            srcSet={source.srcSet}
            sizes={sizes}
          />
        ))}
        
        <Image
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      </picture>
    </Box>
  );
};

export default OptimizedImage;
