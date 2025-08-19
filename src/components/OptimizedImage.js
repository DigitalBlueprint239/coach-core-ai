"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedImage = void 0;
const react_1 = __importStar(require("react"));
const OptimizedImage = ({ src, alt, className, width, height, }) => {
    const [imageSrc, setImageSrc] = (0, react_1.useState)('/placeholder.png');
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        // Create responsive image URL
        const imageUrl = new URL(src, window.location.origin);
        if (width)
            imageUrl.searchParams.set('w', width.toString());
        if (height)
            imageUrl.searchParams.set('h', height.toString());
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
    return (react_1.default.createElement("div", { className: `relative ${className}` },
        isLoading && (react_1.default.createElement("div", { className: "absolute inset-0 bg-gray-200 animate-pulse" })),
        react_1.default.createElement("img", { src: imageSrc, alt: alt, loading: "lazy", className: `${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity` })));
};
exports.OptimizedImage = OptimizedImage;
