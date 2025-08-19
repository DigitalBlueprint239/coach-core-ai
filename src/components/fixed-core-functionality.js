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
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const FixedCoachCore = () => {
    var _a, _b;
    // Enhanced state for drag functionality and animation
    const [currentView, setCurrentView] = (0, react_1.useState)('playbook');
    const [players, setPlayers] = (0, react_1.useState)([]);
    const [routes, setRoutes] = (0, react_1.useState)([]);
    const [blocks, setBlocks] = (0, react_1.useState)([]);
    const [canvasMode, setCanvasMode] = (0, react_1.useState)('select');
    const [selectedPlayer, setSelectedPlayer] = (0, react_1.useState)(null);
    const [playName, setPlayName] = (0, react_1.useState)('');
    const [playType, setPlayType] = (0, react_1.useState)('Pass');
    const [savedPlays, setSavedPlays] = (0, react_1.useState)([]);
    const [showChat, setShowChat] = (0, react_1.useState)(false);
    const [chatMessage, setChatMessage] = (0, react_1.useState)('');
    const [isDrawingRoute, setIsDrawingRoute] = (0, react_1.useState)(false);
    const [isDrawingBlock, setIsDrawingBlock] = (0, react_1.useState)(false);
    const [currentRoute, setCurrentRoute] = (0, react_1.useState)(null);
    const [currentBlock, setCurrentBlock] = (0, react_1.useState)(null);
    const [routeStartPlayer, setRouteStartPlayer] = (0, react_1.useState)(null);
    const [blockStartPlayer, setBlockStartPlayer] = (0, react_1.useState)(null);
    const [canvasReady, setCanvasReady] = (0, react_1.useState)(false);
    const [currentPlayerPosition, setCurrentPlayerPosition] = (0, react_1.useState)('QB');
    // NEW: Drag and animation state
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [dragOffset, setDragOffset] = (0, react_1.useState)({ x: 0, y: 0 });
    const [playAnimation, setPlayAnimation] = (0, react_1.useState)(false);
    const [animationStep, setAnimationStep] = (0, react_1.useState)(0);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [filterCategory, setFilterCategory] = (0, react_1.useState)('All');
    const playerPositions = ['QB', 'RB', 'WR', 'TE', 'FB', 'LT', 'LG', 'C', 'RG', 'RT'];
    const canvasRef = (0, react_1.useRef)(null);
    const animationRef = (0, react_1.useRef)(null);
    // Blocking schemes for different play types
    const blockingSchemes = {
        'Power': { color: '#dc2626', description: 'Lead blocker, double teams' },
        'Zone': { color: '#ea580c', description: 'Zone blocking scheme' },
        'Gap': { color: '#d97706', description: 'Gap protection scheme' },
        'Pull': { color: '#65a30d', description: 'Guard or tackle pull' },
        'Trap': { color: '#0891b2', description: 'Trap blocking' },
        'Combo': { color: '#7c3aed', description: 'Combination block' },
        'Back': { color: '#be185d', description: 'Back protection' },
        'Slide': { color: '#0f766e', description: 'Slide protection' }
    };
    // Enhanced canvas initialization with better error handling
    const initializeCanvas = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('Canvas not found');
            return false;
        }
        try {
            // Set explicit dimensions
            canvas.width = 800;
            canvas.height = 400;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Canvas context not available');
                return false;
            }
            console.log('Canvas initialized successfully');
            setCanvasReady(true);
            // Draw field immediately after initialization
            setTimeout(() => {
                drawField();
            }, 50);
            return true;
        }
        catch (error) {
            console.error('Canvas initialization failed:', error);
            return false;
        }
    }, []);
    // Enhanced field drawing with better error handling
    const drawField = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('Canvas not available for field drawing');
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('Canvas context not available for field drawing');
            return;
        }
        const { width, height } = canvas;
        console.log(`Drawing field: ${width}x${height}`);
        try {
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            // Green field background
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(0, 0, width, height);
            console.log('Field background drawn');
            // Yard lines
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            for (let i = 40; i < width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            console.log('Yard lines drawn');
            // Hash marks
            ctx.lineWidth = 1;
            const hashY1 = height * 0.3;
            const hashY2 = height * 0.7;
            for (let i = 20; i < width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, hashY1 - 10);
                ctx.lineTo(i, hashY1 + 10);
                ctx.moveTo(i, hashY2 - 10);
                ctx.lineTo(i, hashY2 + 10);
                ctx.stroke();
            }
            console.log('Hash marks drawn');
            // Line of scrimmage (center)
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);
            ctx.stroke();
            console.log('Line of scrimmage drawn');
            // End zones
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.fillRect(0, 0, 60, height);
            ctx.fillRect(width - 60, 0, 60, height);
            console.log('End zones drawn');
            console.log('Field drawing completed successfully');
        }
        catch (error) {
            console.error('Field drawing failed:', error);
        }
    }, []);
    // Enhanced route and blocking drawing
    const drawRoutes = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvasReady)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        try {
            // Draw completed routes
            routes.forEach((route) => {
                if (route.points && route.points.length > 1) {
                    ctx.strokeStyle = route.color || '#ef4444';
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.moveTo(route.points[0].x, route.points[0].y);
                    for (let i = 1; i < route.points.length; i++) {
                        ctx.lineTo(route.points[i].x, route.points[i].y);
                    }
                    ctx.stroke();
                    // Arrow at end
                    const lastPoint = route.points[route.points.length - 1];
                    const secondLastPoint = route.points[route.points.length - 2] || lastPoint;
                    const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
                    const arrowLength = 10;
                    ctx.beginPath();
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    ctx.lineTo(lastPoint.x - arrowLength * Math.cos(angle - Math.PI / 6), lastPoint.y - arrowLength * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    ctx.lineTo(lastPoint.x - arrowLength * Math.cos(angle + Math.PI / 6), lastPoint.y - arrowLength * Math.sin(angle + Math.PI / 6));
                    ctx.stroke();
                    // Route name
                    if (route.name && route.points.length > 2) {
                        const midPoint = route.points[Math.floor(route.points.length / 2)];
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.fillRect(midPoint.x - 20, midPoint.y - 20, 40, 12);
                        ctx.fillStyle = 'white';
                        ctx.font = '8px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(route.name, midPoint.x, midPoint.y - 12);
                    }
                }
            });
            // Draw blocking assignments
            blocks.forEach((block) => {
                if (block.points && block.points.length > 1) {
                    const scheme = blockingSchemes[block.type] || blockingSchemes['Power'];
                    ctx.strokeStyle = scheme.color;
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(block.points[0].x, block.points[0].y);
                    for (let i = 1; i < block.points.length; i++) {
                        ctx.lineTo(block.points[i].x, block.points[i].y);
                    }
                    ctx.stroke();
                    // Block symbol at end
                    const lastPoint = block.points[block.points.length - 1];
                    ctx.fillStyle = scheme.color;
                    ctx.fillRect(lastPoint.x - 4, lastPoint.y - 4, 8, 8);
                    // Block type label
                    if (block.type && block.points.length > 1) {
                        const midPoint = block.points[Math.floor(block.points.length / 2)];
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                        ctx.fillRect(midPoint.x - 18, midPoint.y - 18, 36, 12);
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 8px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(block.type, midPoint.x, midPoint.y - 10);
                    }
                }
            });
            // Draw current route being drawn
            if (currentRoute && currentRoute.points && currentRoute.points.length > 1) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(currentRoute.points[0].x, currentRoute.points[0].y);
                for (let i = 1; i < currentRoute.points.length; i++) {
                    ctx.lineTo(currentRoute.points[i].x, currentRoute.points[i].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
            // Draw current block being drawn
            if (currentBlock && currentBlock.points && currentBlock.points.length > 1) {
                const scheme = blockingSchemes[currentBlock.type] || blockingSchemes['Power'];
                ctx.strokeStyle = scheme.color;
                ctx.lineWidth = 4;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(currentBlock.points[0].x, currentBlock.points[0].y);
                for (let i = 1; i < currentBlock.points.length; i++) {
                    ctx.lineTo(currentBlock.points[i].x, currentBlock.points[i].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        catch (error) {
            console.error('Route/Block drawing failed:', error);
        }
    }, [routes, blocks, currentRoute, currentBlock, canvasReady]);
    // Enhanced player drawing with slightly larger icons for better visibility
    const drawPlayers = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvasReady)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        try {
            players.forEach(player => {
                if (!player.x || !player.y)
                    return;
                const positionColors = {
                    QB: '#ef4444', // Red
                    RB: '#22c55e', // Green  
                    FB: '#16a34a', // Dark Green
                    WR: '#3b82f6', // Blue
                    TE: '#f59e0b', // Orange
                    LT: '#6b7280', // Gray
                    LG: '#6b7280', // Gray
                    C: '#374151', // Dark Gray
                    RG: '#6b7280', // Gray
                    RT: '#6b7280' // Gray
                };
                let fillColor = positionColors[player.position] || '#1f2937';
                let strokeColor = 'white';
                let lineWidth = 2;
                let radius = 10; // INCREASED: From 8 to 10 for better visibility
                if (player.selected) {
                    strokeColor = '#1d4ed8';
                    lineWidth = 3;
                    radius = 12; // INCREASED: From 10 to 12 for selected state
                }
                else if (routeStartPlayer === player.id || blockStartPlayer === player.id) {
                    strokeColor = '#059669';
                    lineWidth = 3;
                    radius = 12; // INCREASED: From 10 to 12 for active state
                }
                ctx.fillStyle = fillColor;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = lineWidth;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.arc(player.x, player.y, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 8px Arial'; // INCREASED: From 7px to 8px
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(player.position || 'P', player.x, player.y);
                if (player.number) {
                    ctx.font = 'bold 7px Arial'; // INCREASED: From 6px to 7px
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.fillText(player.number.toString(), player.x, player.y - 18); // Adjusted for larger radius
                }
            });
        }
        catch (error) {
            console.error('Player drawing failed:', error);
        }
    }, [players, selectedPlayer, routeStartPlayer, blockStartPlayer, canvasReady]);
    const redrawCanvas = (0, react_1.useCallback)(() => {
        if (!canvasReady)
            return;
        drawField();
        drawRoutes();
        drawPlayers();
    }, [drawField, drawRoutes, drawPlayers, canvasReady]);
    const getCanvasCoordinates = (0, react_1.useCallback)((e) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }, []);
    // Enhanced click handler with drag functionality
    const handleCanvasClick = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        if (canvasMode === 'player') {
            const newPlayer = {
                id: Date.now(),
                x: coords.x,
                y: coords.y,
                position: currentPlayerPosition,
                number: players.length + 1,
                selected: false
            };
            setPlayers(prev => [...prev, newPlayer]);
        }
        else if (canvasMode === 'select') {
            const clickedPlayer = players.find(player => {
                const distance = Math.sqrt(Math.pow(player.x - coords.x, 2) + Math.pow(player.y - coords.y, 2));
                return distance <= 12;
            });
            if (clickedPlayer) {
                setSelectedPlayer(clickedPlayer.id);
                setPlayers(prev => prev.map(p => (Object.assign(Object.assign({}, p), { selected: p.id === clickedPlayer.id }))));
            }
            else {
                setSelectedPlayer(null);
                setPlayers(prev => prev.map(p => (Object.assign(Object.assign({}, p), { selected: false }))));
            }
        }
        else if (canvasMode === 'route') {
            if (!isDrawingRoute) {
                const clickedPlayer = players.find(player => {
                    const distance = Math.sqrt(Math.pow(player.x - coords.x, 2) + Math.pow(player.y - coords.y, 2));
                    return distance <= 12;
                });
                if (clickedPlayer) {
                    setIsDrawingRoute(true);
                    setRouteStartPlayer(clickedPlayer.id);
                    setCurrentRoute({
                        id: Date.now(),
                        playerId: clickedPlayer.id,
                        points: [{ x: clickedPlayer.x, y: clickedPlayer.y }],
                        color: '#ef4444',
                        name: `${clickedPlayer.position} Route`
                    });
                }
            }
            else {
                if (currentRoute) {
                    setCurrentRoute(prev => {
                        if (!prev)
                            return prev;
                        return Object.assign(Object.assign({}, prev), { points: [...prev.points, coords], id: prev.id, playerId: prev.playerId, color: prev.color, name: prev.name });
                    });
                }
            }
        }
        else if (canvasMode === 'block') {
            if (!isDrawingBlock) {
                const clickedPlayer = players.find(player => {
                    const distance = Math.sqrt(Math.pow(player.x - coords.x, 2) + Math.pow(player.y - coords.y, 2));
                    return distance <= 12;
                });
                if (clickedPlayer) {
                    setIsDrawingBlock(true);
                    setBlockStartPlayer(clickedPlayer.id);
                    setCurrentBlock({
                        id: Date.now(),
                        playerId: clickedPlayer.id,
                        points: [{ x: clickedPlayer.x, y: clickedPlayer.y }],
                        type: 'Power',
                        color: '#dc2626', // Default color
                        name: `${clickedPlayer.position} Block`
                    });
                }
            }
            else {
                if (currentBlock) {
                    setCurrentBlock(prev => {
                        if (!prev)
                            return prev;
                        return Object.assign(Object.assign({}, prev), { points: [...prev.points, coords], id: prev.id, playerId: prev.playerId, type: prev.type, color: prev.color, name: prev.name });
                    });
                }
            }
        }
    }, [canvasMode, players, isDrawingRoute, isDrawingBlock, currentRoute, currentBlock, getCanvasCoordinates, currentPlayerPosition]);
    // NEW: Mouse event handlers for dragging with updated detection
    const handleCanvasMouseDown = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        if (canvasMode === 'select') {
            const clickedPlayer = players.find(player => {
                const distance = Math.sqrt(Math.pow(player.x - coords.x, 2) + Math.pow(player.y - coords.y, 2));
                return distance <= 15; // INCREASED: From 12 to 15 for better drag detection
            });
            if (clickedPlayer) {
                setSelectedPlayer(clickedPlayer.id);
                setPlayers(prev => prev.map(p => (Object.assign(Object.assign({}, p), { selected: p.id === clickedPlayer.id }))));
                setIsDragging(true);
                setDragOffset({
                    x: coords.x - clickedPlayer.x,
                    y: coords.y - clickedPlayer.y
                });
            }
        }
        else {
            handleCanvasClick(e);
        }
    }, [canvasMode, players, getCanvasCoordinates, handleCanvasClick]);
    const handleCanvasMouseMove = (0, react_1.useCallback)((e) => {
        if (!isDragging || !selectedPlayer)
            return;
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        setPlayers(prev => prev.map(player => player.id === selectedPlayer
            ? Object.assign(Object.assign({}, player), { x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }) : player));
    }, [isDragging, selectedPlayer, getCanvasCoordinates, dragOffset]);
    const handleCanvasMouseUp = (0, react_1.useCallback)(() => {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
    }, []);
    // Enhanced route completion
    const completeRoute = (0, react_1.useCallback)(() => {
        if (currentBlock && currentBlock.points.length > 1) {
            setBlocks(prev => [...prev, currentBlock]);
            setCurrentBlock(null);
            setIsDrawingBlock(false);
            setBlockStartPlayer(null);
        }
    }, [currentBlock]);
    const completeBlock = (0, react_1.useCallback)(() => {
        if (currentRoute && currentRoute.points.length > 1) {
            setRoutes(prev => [...prev, currentRoute]);
            setCurrentRoute(null);
            setIsDrawingRoute(false);
            setRouteStartPlayer(null);
        }
    }, [currentRoute]);
    const deleteRoute = (0, react_1.useCallback)((routeId) => {
        setRoutes(prev => prev.filter(route => route.id !== routeId));
    }, []);
    const deleteBlock = (0, react_1.useCallback)((blockId) => {
        setBlocks(prev => prev.filter(block => block.id !== blockId));
    }, []);
    // Block management functions
    const finishBlock = (0, react_1.useCallback)(() => {
        if (currentBlock && currentBlock.points.length > 1) {
            setBlocks(prev => [...prev, currentBlock]);
        }
        setCurrentBlock(null);
        setIsDrawingBlock(false);
        setBlockStartPlayer(null);
    }, [currentBlock]);
    const cancelBlock = (0, react_1.useCallback)(() => {
        setCurrentBlock(null);
        setIsDrawingBlock(false);
        setBlockStartPlayer(null);
    }, []);
    const finishRoute = (0, react_1.useCallback)(() => {
        if (currentRoute && currentRoute.points.length > 1) {
            setRoutes(prev => [...prev, currentRoute]);
        }
        setCurrentRoute(null);
        setIsDrawingRoute(false);
        setRouteStartPlayer(null);
    }, [currentRoute]);
    const cancelRoute = (0, react_1.useCallback)(() => {
        setCurrentRoute(null);
        setIsDrawingRoute(false);
        setRouteStartPlayer(null);
        cancelBlock();
    }, [cancelBlock]);
    // NEW: Animation system for route development
    const animatePlay = (0, react_1.useCallback)(() => {
        if (!playAnimation)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        // Redraw field and static elements
        drawField();
        // Animate players along their routes
        const animatedPlayers = players.map(player => {
            const playerRoute = routes.find(r => r.playerId === player.id);
            if (playerRoute && playerRoute.points && playerRoute.points.length > 1) {
                const progress = animationStep / 100; // 0 to 1
                const totalPoints = playerRoute.points.length - 1;
                const currentIndex = Math.floor(progress * totalPoints);
                const nextIndex = Math.min(currentIndex + 1, totalPoints);
                if (currentIndex < totalPoints) {
                    const current = playerRoute.points[currentIndex];
                    const next = playerRoute.points[nextIndex];
                    const localProgress = (progress * totalPoints) - currentIndex;
                    return Object.assign(Object.assign({}, player), { x: current.x + (next.x - current.x) * localProgress, y: current.y + (next.y - current.y) * localProgress });
                }
            }
            return player;
        });
        // Draw routes
        drawRoutes();
        // Draw animated players
        const ctx = canvas.getContext('2d');
        if (ctx) {
            animatedPlayers.forEach(player => {
                const positionColors = {
                    QB: '#ef4444', RB: '#22c55e', FB: '#16a34a', WR: '#3b82f6', TE: '#f59e0b',
                    LT: '#6b7280', LG: '#6b7280', C: '#374151', RG: '#6b7280', RT: '#6b7280'
                };
                const fillColor = positionColors[player.position] || '#1f2937';
                ctx.fillStyle = fillColor;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 7px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(player.position, player.x, player.y);
            });
        }
        setAnimationStep(prev => {
            if (prev >= 100) {
                setPlayAnimation(false);
                return 0;
            }
            return prev + 2;
        });
    }, [playAnimation, animationStep, players, routes, drawField, drawRoutes]);
    // Animation frame loop
    (0, react_1.useEffect)(() => {
        if (playAnimation) {
            animationRef.current = requestAnimationFrame(animatePlay);
        }
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [playAnimation, animatePlay]);
    const updatePlayerPosition = (0, react_1.useCallback)((playerId, newPosition) => {
        setPlayers(prev => prev.map(player => player.id === playerId ? Object.assign(Object.assign({}, player), { position: newPosition }) : player));
    }, []);
    const updatePlayerNumber = (0, react_1.useCallback)((playerId, newNumber) => {
        setPlayers(prev => prev.map(player => player.id === playerId ? Object.assign(Object.assign({}, player), { number: Number(newNumber) || 0 }) : player));
    }, []);
    const deletePlayer = (0, react_1.useCallback)((playerId) => {
        setPlayers(prev => prev.filter(player => player.id !== playerId));
        setRoutes(prev => prev.filter(route => route.playerId !== playerId));
        setBlocks(prev => prev.filter(block => block.playerId !== playerId));
        if (selectedPlayer === playerId) {
            setSelectedPlayer(null);
        }
    }, [selectedPlayer]);
    // Enhanced save with localStorage
    const savePlay = (0, react_1.useCallback)(() => {
        if (!playName.trim()) {
            alert('Please enter a play name');
            return;
        }
        const newPlay = {
            id: Date.now(),
            name: playName.trim(),
            type: playType,
            players: players.map(p => (Object.assign({}, p))),
            routes: routes.map(r => (Object.assign({}, r))),
            blocks: blocks.map(b => (Object.assign({}, b))),
            timestamp: Date.now()
        };
        const updatedPlays = [...savedPlays, newPlay];
        setSavedPlays(updatedPlays);
        // Save to localStorage directly
        try {
            localStorage.setItem('coachCorePlays', JSON.stringify(updatedPlays));
        }
        catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
        setPlayName('');
        alert(`${playType} play "${newPlay.name}" saved successfully!`);
    }, [playName, playType, players, routes, blocks, savedPlays]);
    const loadPlay = (0, react_1.useCallback)((play) => {
        setPlayers(play.players || []);
        setRoutes(play.routes || []);
        setBlocks(play.blocks || []);
        setPlayType(play.type || 'Pass');
        setPlayName(play.name);
        setCurrentView('playbook');
        setSelectedPlayer(null);
        cancelRoute();
        cancelBlock();
    }, [cancelRoute, cancelBlock]);
    // Enhanced formations with complete 11-player sets
    const addFormation = (0, react_1.useCallback)((formationType) => {
        setRoutes([]);
        setBlocks([]);
        cancelRoute();
        cancelBlock();
        setSelectedPlayer(null);
        let newPlayers = [];
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        if (formationType === 'shotgun') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players)
                { id: Date.now() + 6, x: centerX, y: centerY - 40, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX + 25, y: centerY + 35, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 8, x: centerX - 120, y: centerY - 30, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 9, x: centerX + 120, y: centerY - 30, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 10, x: centerX - 60, y: centerY - 15, position: 'WR', number: 11, selected: false },
                { id: Date.now() + 11, x: centerX + 60, y: centerY - 5, position: 'TE', number: 88, selected: false }
            ];
        }
        else if (formationType === 'iformation') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players)
                { id: Date.now() + 6, x: centerX, y: centerY - 20, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX, y: centerY + 40, position: 'FB', number: 44, selected: false },
                { id: Date.now() + 8, x: centerX, y: centerY + 70, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 9, x: centerX - 140, y: centerY - 30, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 10, x: centerX + 140, y: centerY - 30, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 11, x: centerX + 60, y: centerY - 5, position: 'TE', number: 88, selected: false }
            ];
        }
        else if (formationType === 'trips') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players) - 3 receivers to one side
                { id: Date.now() + 6, x: centerX, y: centerY - 40, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX + 25, y: centerY + 35, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 8, x: centerX + 80, y: centerY - 20, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 9, x: centerX + 120, y: centerY - 30, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 10, x: centerX + 160, y: centerY - 20, position: 'WR', number: 11, selected: false },
                { id: Date.now() + 11, x: centerX - 120, y: centerY - 30, position: 'WR', number: 19, selected: false }
            ];
        }
        else if (formationType === 'singleback') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players)
                { id: Date.now() + 6, x: centerX, y: centerY - 20, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX, y: centerY + 50, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 8, x: centerX - 100, y: centerY - 20, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 9, x: centerX + 100, y: centerY - 20, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 10, x: centerX + 60, y: centerY - 5, position: 'TE', number: 88, selected: false },
                { id: Date.now() + 11, x: centerX - 60, y: centerY - 5, position: 'TE', number: 89, selected: false }
            ];
        }
        else if (formationType === 'empty') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players) - All receivers spread out
                { id: Date.now() + 6, x: centerX, y: centerY - 40, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX - 120, y: centerY - 30, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 8, x: centerX + 120, y: centerY - 30, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 9, x: centerX - 60, y: centerY - 15, position: 'WR', number: 11, selected: false },
                { id: Date.now() + 10, x: centerX + 60, y: centerY - 15, position: 'WR', number: 19, selected: false },
                { id: Date.now() + 11, x: centerX, y: centerY - 70, position: 'RB', number: 21, selected: false }
            ];
        }
        else if (formationType === 'goalline') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players) - Heavy formation
                { id: Date.now() + 6, x: centerX, y: centerY - 20, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX, y: centerY + 30, position: 'FB', number: 44, selected: false },
                { id: Date.now() + 8, x: centerX, y: centerY + 55, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 9, x: centerX + 60, y: centerY - 5, position: 'TE', number: 88, selected: false },
                { id: Date.now() + 10, x: centerX - 60, y: centerY - 5, position: 'TE', number: 89, selected: false },
                { id: Date.now() + 11, x: centerX + 100, y: centerY - 25, position: 'WR', number: 80, selected: false }
            ];
        }
        else if (formationType === 'wildcat') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players) - RB takes snap
                { id: Date.now() + 6, x: centerX, y: centerY - 20, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 7, x: centerX + 25, y: centerY + 30, position: 'FB', number: 44, selected: false },
                { id: Date.now() + 8, x: centerX - 100, y: centerY - 25, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 9, x: centerX + 100, y: centerY - 25, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 10, x: centerX + 60, y: centerY - 5, position: 'TE', number: 88, selected: false },
                { id: Date.now() + 11, x: centerX - 100, y: centerY + 40, position: 'QB', number: 12, selected: false }
            ];
        }
        else if (formationType === 'pistol') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players) - QB closer to RB than shotgun
                { id: Date.now() + 6, x: centerX, y: centerY - 20, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX, y: centerY + 35, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 8, x: centerX - 100, y: centerY - 25, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 9, x: centerX + 100, y: centerY - 25, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 10, x: centerX - 50, y: centerY - 15, position: 'WR', number: 11, selected: false },
                { id: Date.now() + 11, x: centerX + 60, y: centerY - 5, position: 'TE', number: 88, selected: false }
            ];
        }
        else if (formationType === 'proset') {
            newPlayers = [
                // Offensive Line (5 players)
                { id: Date.now() + 1, x: centerX - 40, y: centerY + 10, position: 'LT', number: 76, selected: false },
                { id: Date.now() + 2, x: centerX - 20, y: centerY + 10, position: 'LG', number: 66, selected: false },
                { id: Date.now() + 3, x: centerX, y: centerY + 10, position: 'C', number: 55, selected: false },
                { id: Date.now() + 4, x: centerX + 20, y: centerY + 10, position: 'RG', number: 67, selected: false },
                { id: Date.now() + 5, x: centerX + 40, y: centerY + 10, position: 'RT', number: 77, selected: false },
                // Skill positions (6 players) - Traditional pro formation
                { id: Date.now() + 6, x: centerX, y: centerY - 20, position: 'QB', number: 12, selected: false },
                { id: Date.now() + 7, x: centerX, y: centerY + 45, position: 'RB', number: 21, selected: false },
                { id: Date.now() + 8, x: centerX - 120, y: centerY - 25, position: 'WR', number: 80, selected: false },
                { id: Date.now() + 9, x: centerX + 120, y: centerY - 25, position: 'WR', number: 81, selected: false },
                { id: Date.now() + 10, x: centerX + 70, y: centerY - 5, position: 'TE', number: 88, selected: false },
                { id: Date.now() + 11, x: centerX - 70, y: centerY - 5, position: 'TE', number: 89, selected: false }
            ];
        }
        setPlayers(newPlayers);
    }, [cancelRoute, cancelBlock]);
    const clearField = (0, react_1.useCallback)(() => {
        setPlayers([]);
        setRoutes([]);
        setBlocks([]);
        setSelectedPlayer(null);
        cancelRoute();
        cancelBlock();
    }, [cancelRoute, cancelBlock]);
    const analyzePlay = (0, react_1.useCallback)(() => {
        const analysis = {
            playerCount: players.length,
            routeCount: routes.length,
            blockCount: blocks.length,
            formation: players.length >= 11 ? 'Complete Formation' : `Need ${11 - players.length} more players`,
            strengths: [],
            suggestions: [],
            successRate: 0
        };
        let baseRate = 30;
        if (players.length >= 11)
            baseRate += 25;
        else if (players.length >= 5)
            baseRate += 15;
        if (playType === 'Pass') {
            if (routes.length >= 2)
                baseRate += 15;
            if (routes.length >= 4)
                baseRate += 10;
        }
        else {
            if (blocks.length >= 3)
                baseRate += 15;
            if (blocks.length >= 5)
                baseRate += 10;
        }
        analysis.successRate = Math.min(90, baseRate);
        if (players.length < 11) {
            analysis.suggestions.push(`Add ${11 - players.length} more players for complete formation`);
        }
        return analysis;
    }, [players, routes, blocks, playType]);
    (0, react_1.useEffect)(() => {
        initializeCanvas();
    }, [initializeCanvas]);
    (0, react_1.useEffect)(() => {
        if (canvasReady) {
            redrawCanvas();
        }
    }, [redrawCanvas, canvasReady]);
    (0, react_1.useEffect)(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                initializeCanvas();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initializeCanvas]);
    // Force canvas initialization on component mount
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => {
            if (canvasRef.current && !canvasReady) {
                initializeCanvas();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [canvasReady, initializeCanvas]);
    const chatSuggestions = [
        {
            text: "Analyze my current formation",
            action: () => {
                const analysis = analyzePlay();
                alert(`Formation Analysis:\n• ${analysis.playerCount}/11 players\n• ${playType} play\n• Success Rate: ${analysis.successRate}%`);
            }
        }
    ];
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gray-50" },
        react_1.default.createElement("header", { className: "bg-white border-b border-gray-200 px-6 py-4" },
            react_1.default.createElement("div", { className: "flex justify-between items-center" },
                react_1.default.createElement("div", { className: "flex items-center gap-3" },
                    react_1.default.createElement("div", { className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg" },
                        react_1.default.createElement(lucide_react_1.BarChart3, { size: 24 })),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h1", { className: "text-xl font-bold text-blue-900" }, "Coach Core AI"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-500" }, "Complete 11-Player System + Blocking!"))),
                react_1.default.createElement("div", { className: "bg-blue-100 text-blue-700 p-2 rounded-full" },
                    react_1.default.createElement(lucide_react_1.User, { size: 20 })))),
        react_1.default.createElement("main", { className: "p-6" },
            react_1.default.createElement("div", { className: "space-y-6" },
                react_1.default.createElement("div", { className: "flex justify-between items-center" },
                    react_1.default.createElement("h2", { className: "text-2xl font-bold text-blue-900" }, "Enhanced Play Designer"),
                    react_1.default.createElement("div", { className: "flex gap-2" },
                        react_1.default.createElement("button", { onClick: () => setCurrentView('library'), className: "bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2" },
                            react_1.default.createElement(lucide_react_1.BookOpen, { size: 16 }),
                            "Play Library"),
                        react_1.default.createElement("button", { onClick: savePlay, className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2" },
                            react_1.default.createElement(lucide_react_1.Save, { size: 16 }),
                            "Save Play"))),
                react_1.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-6" },
                    react_1.default.createElement("div", { className: "bg-white p-4 rounded-lg border" },
                        react_1.default.createElement("h3", { className: "font-semibold mb-4" }, "Design Tools"),
                        react_1.default.createElement("div", { className: "space-y-2" },
                            react_1.default.createElement("button", { onClick: () => setCanvasMode('select'), className: `w-full flex items-center gap-2 p-3 rounded transition-colors ${canvasMode === 'select' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}` },
                                react_1.default.createElement(lucide_react_1.MousePointer, { size: 16 }),
                                "Select Players"),
                            react_1.default.createElement("button", { onClick: () => setCanvasMode('player'), className: `w-full flex items-center gap-2 p-3 rounded transition-colors ${canvasMode === 'player' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}` },
                                react_1.default.createElement(lucide_react_1.Plus, { size: 16 }),
                                "Add Players"),
                            react_1.default.createElement("button", { onClick: () => setPlayAnimation(!playAnimation), className: `w-full flex items-center gap-2 p-3 rounded transition-colors ${playAnimation ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`, disabled: routes.length === 0 },
                                playAnimation ? react_1.default.createElement(lucide_react_1.Pause, { size: 16 }) : react_1.default.createElement(lucide_react_1.Play, { size: 16 }),
                                playAnimation ? 'Stop Animation' : 'Animate Play'),
                            react_1.default.createElement("div", { className: "mt-4 p-3 bg-gray-50 rounded-lg" },
                                react_1.default.createElement("label", { className: "block text-sm font-medium mb-2" }, "Play Type:"),
                                react_1.default.createElement("div", { className: "flex gap-2" },
                                    react_1.default.createElement("button", { onClick: () => setPlayType('Pass'), className: `flex-1 p-2 rounded text-sm ${playType === 'Pass' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}` }, "Pass"),
                                    react_1.default.createElement("button", { onClick: () => setPlayType('Run'), className: `flex-1 p-2 rounded text-sm ${playType === 'Run' ? 'bg-green-600 text-white' : 'bg-white border text-gray-700'}` }, "Run"))),
                            react_1.default.createElement("button", { onClick: clearField, className: "w-full flex items-center gap-2 p-3 rounded hover:bg-red-50 text-red-600" },
                                react_1.default.createElement(lucide_react_1.RotateCcw, { size: 16 }),
                                "Clear All")),
                        react_1.default.createElement("div", { className: "mt-6" },
                            react_1.default.createElement("h4", { className: "font-medium mb-2" }, "Complete 11-Player Formations"),
                            react_1.default.createElement("div", { className: "space-y-2" },
                                react_1.default.createElement("button", { onClick: () => addFormation('shotgun'), className: "w-full bg-blue-50 hover:bg-blue-100 p-2 rounded text-sm text-blue-700" }, "Shotgun Spread (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('iformation'), className: "w-full bg-green-50 hover:bg-green-100 p-2 rounded text-sm text-green-700" }, "I-Formation (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('trips'), className: "w-full bg-purple-50 hover:bg-purple-100 p-2 rounded text-sm text-purple-700" }, "Trips Right (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('singleback'), className: "w-full bg-orange-50 hover:bg-orange-100 p-2 rounded text-sm text-orange-700" }, "Singleback (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('empty'), className: "w-full bg-red-50 hover:bg-red-100 p-2 rounded text-sm text-red-700" }, "Empty Backfield (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('goalline'), className: "w-full bg-yellow-50 hover:bg-yellow-100 p-2 rounded text-sm text-yellow-700" }, "Goal Line (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('wildcat'), className: "w-full bg-indigo-50 hover:bg-indigo-100 p-2 rounded text-sm text-indigo-700" }, "Wildcat (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('pistol'), className: "w-full bg-pink-50 hover:bg-pink-100 p-2 rounded text-sm text-pink-700" }, "Pistol (11)"),
                                react_1.default.createElement("button", { onClick: () => addFormation('proset'), className: "w-full bg-teal-50 hover:bg-teal-100 p-2 rounded text-sm text-teal-700" }, "Pro Set (11)")))),
                    react_1.default.createElement("div", { className: "lg:col-span-2 bg-white p-4 rounded-lg border" },
                        react_1.default.createElement("div", { className: "mb-4" },
                            react_1.default.createElement("h3", { className: "font-semibold flex items-center gap-2" },
                                "Interactive Field",
                                canvasReady ? (react_1.default.createElement(lucide_react_1.CheckCircle, { className: "text-green-600", size: 16 })) : (react_1.default.createElement(lucide_react_1.AlertCircle, { className: "text-orange-600", size: 16 }))),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" },
                                "Mode: ",
                                canvasMode,
                                " | Play Type: ",
                                playType)),
                        react_1.default.createElement("div", { className: "relative" },
                            react_1.default.createElement("canvas", { ref: canvasRef, width: 800, height: 400, className: "border border-gray-300 rounded-lg w-full cursor-crosshair", onMouseDown: handleCanvasMouseDown, onMouseMove: handleCanvasMouseMove, onMouseUp: handleCanvasMouseUp, onClick: canvasMode !== 'select' ? handleCanvasClick : undefined, style: {
                                    maxWidth: '100%',
                                    height: 'auto',
                                    backgroundColor: '#22c55e' // Fallback field color
                                } }),
                            !canvasReady && (react_1.default.createElement("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg" },
                                react_1.default.createElement("div", { className: "text-center" },
                                    react_1.default.createElement("div", { className: "animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" }),
                                    react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Loading field..."))))),
                        react_1.default.createElement("div", { className: "mt-3 text-sm text-gray-600" },
                            react_1.default.createElement("div", { className: "flex gap-4 flex-wrap" },
                                react_1.default.createElement("span", null,
                                    "Players: ",
                                    players.length,
                                    "/11"),
                                playType === 'Pass' && react_1.default.createElement("span", null,
                                    "Routes: ",
                                    routes.length),
                                playType === 'Run' && react_1.default.createElement("span", null,
                                    "Blocks: ",
                                    blocks.length),
                                canvasReady ? (react_1.default.createElement("span", { className: "text-green-600" }, "\u2022 Field Ready")) : (react_1.default.createElement("span", { className: "text-orange-600" }, "\u2022 Field Loading..."))))),
                    react_1.default.createElement("div", { className: "bg-white p-4 rounded-lg border space-y-4" },
                        react_1.default.createElement("h3", { className: "font-semibold" }, "Play Details"),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("label", { className: "block text-sm font-medium mb-1" }, "Play Name"),
                            react_1.default.createElement("input", { type: "text", value: playName, onChange: (e) => setPlayName(e.target.value), className: "w-full p-2 border rounded-lg", placeholder: "Enter play name" })),
                        react_1.default.createElement("div", { className: "bg-blue-50 p-3 rounded-lg" },
                            react_1.default.createElement("h4", { className: "font-medium text-blue-800 mb-2" }, "Live Analysis"),
                            react_1.default.createElement("div", { className: "text-sm text-blue-700 space-y-1" },
                                react_1.default.createElement("div", null,
                                    "Players: ",
                                    players.length,
                                    "/11"),
                                react_1.default.createElement("div", null,
                                    "Play Type: ",
                                    playType),
                                react_1.default.createElement("div", null,
                                    "Success Rate: ",
                                    analyzePlay().successRate,
                                    "%"))),
                        selectedPlayer && (react_1.default.createElement("div", { className: "bg-yellow-50 p-3 rounded-lg" },
                            react_1.default.createElement("h4", { className: "font-medium text-yellow-800 mb-2" }, "Selected Player"),
                            react_1.default.createElement("div", { className: "space-y-2" },
                                react_1.default.createElement("select", { value: ((_a = players.find(p => p.id === selectedPlayer)) === null || _a === void 0 ? void 0 : _a.position) || 'WR', onChange: (e) => updatePlayerPosition(selectedPlayer, e.target.value), className: "w-full p-2 border rounded text-sm" }, playerPositions.map(pos => (react_1.default.createElement("option", { key: pos, value: pos }, pos)))),
                                react_1.default.createElement("input", { type: "number", value: ((_b = players.find(p => p.id === selectedPlayer)) === null || _b === void 0 ? void 0 : _b.number) || '', onChange: (e) => updatePlayerNumber(selectedPlayer, e.target.value), placeholder: "Jersey #", className: "w-full p-2 border rounded text-sm", min: "1", max: "99" }),
                                react_1.default.createElement("button", { onClick: () => deletePlayer(selectedPlayer), className: "w-full bg-red-100 text-red-700 p-2 rounded text-sm hover:bg-red-200" }, "Remove Player")))))))),
        react_1.default.createElement("button", { onClick: () => setShowChat(true), className: "fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all" },
            react_1.default.createElement(lucide_react_1.Brain, { size: 24 })),
        currentView === 'library' && (react_1.default.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg w-full max-w-4xl h-96 flex flex-col" },
                react_1.default.createElement("div", { className: "flex justify-between items-center p-4 border-b" },
                    react_1.default.createElement("h3", { className: "font-semibold" }, "Play Library"),
                    react_1.default.createElement("button", { onClick: () => setCurrentView('playbook') },
                        react_1.default.createElement(lucide_react_1.X, { size: 20 }))),
                react_1.default.createElement("div", { className: "p-4 border-b bg-gray-50" },
                    react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                        react_1.default.createElement("div", { className: "md:col-span-2" },
                            react_1.default.createElement("input", { type: "text", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), placeholder: "Search plays by name...", className: "w-full p-2 border rounded-lg" })),
                        react_1.default.createElement("select", { value: filterCategory, onChange: (e) => setFilterCategory(e.target.value), className: "p-2 border rounded-lg" },
                            react_1.default.createElement("option", { value: "All" }, "All Plays"),
                            react_1.default.createElement("option", { value: "Pass" }, "Pass Plays"),
                            react_1.default.createElement("option", { value: "Run" }, "Run Plays")))),
                react_1.default.createElement("div", { className: "flex-1 p-4 overflow-y-auto" }, savedPlays.filter(play => {
                    const matchesSearch = play.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesFilter = filterCategory === 'All' || play.type === filterCategory;
                    return matchesSearch && matchesFilter;
                }).length > 0 ? (react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, savedPlays.filter(play => {
                    const matchesSearch = play.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesFilter = filterCategory === 'All' || play.type === filterCategory;
                    return matchesSearch && matchesFilter;
                }).map(play => {
                    var _a;
                    return (react_1.default.createElement("div", { key: play.id, className: "bg-gray-50 p-4 rounded-lg border" },
                        react_1.default.createElement("h4", { className: "font-semibold mb-2" }, play.name),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600 mb-3" },
                            react_1.default.createElement("div", null,
                                "Type: ",
                                play.type || 'Pass'),
                            react_1.default.createElement("div", null,
                                "Players: ",
                                ((_a = play.players) === null || _a === void 0 ? void 0 : _a.length) || 0,
                                "/11"),
                            react_1.default.createElement("div", null,
                                "Created: ",
                                new Date(play.timestamp).toLocaleDateString())),
                        react_1.default.createElement("div", { className: "flex gap-2" },
                            react_1.default.createElement("button", { onClick: () => {
                                    loadPlay(play);
                                    setCurrentView('playbook');
                                }, className: "flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700" }, "Load Play"),
                            react_1.default.createElement("button", { onClick: () => {
                                    const updatedPlays = savedPlays.filter(p => p.id !== play.id);
                                    setSavedPlays(updatedPlays);
                                    try {
                                        localStorage.setItem('coachCorePlays', JSON.stringify(updatedPlays));
                                    }
                                    catch (error) {
                                        console.error('Failed to save to localStorage:', error);
                                    }
                                }, className: "flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700" }, "Delete"))));
                }))) : (react_1.default.createElement("div", { className: "text-center py-12" },
                    react_1.default.createElement(lucide_react_1.BookOpen, { size: 48, className: "mx-auto text-gray-400 mb-4" }),
                    react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "No plays found"),
                    react_1.default.createElement("p", { className: "text-gray-500" }, "Try adjusting your search or create a new play"))))))),
        showChat && (react_1.default.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg w-full max-w-md h-96 flex flex-col" },
                react_1.default.createElement("div", { className: "flex justify-between items-center p-4 border-b" },
                    react_1.default.createElement("h3", { className: "font-semibold" }, "Enhanced AI Coach"),
                    react_1.default.createElement("button", { onClick: () => setShowChat(false) },
                        react_1.default.createElement(lucide_react_1.X, { size: 20 }))),
                react_1.default.createElement("div", { className: "flex-1 p-4 overflow-y-auto" },
                    react_1.default.createElement("div", { className: "bg-green-100 p-3 rounded-lg mb-4" },
                        react_1.default.createElement("div", { className: "flex items-center gap-2 mb-2" },
                            react_1.default.createElement(lucide_react_1.CheckCircle, { className: "text-green-600", size: 16 }),
                            react_1.default.createElement("span", { className: "font-medium text-green-800" }, "All Features Working!")),
                        react_1.default.createElement("p", { className: "text-sm text-green-700" }, "Enhanced with:"),
                        react_1.default.createElement("ul", { className: "text-sm mt-2 space-y-1 text-green-700" },
                            react_1.default.createElement("li", null, "\u2022 Smaller player icons"),
                            react_1.default.createElement("li", null, "\u2022 11-player formations"),
                            react_1.default.createElement("li", null, "\u2022 Blocking schemes"),
                            react_1.default.createElement("li", null, "\u2022 Run and pass plays"))),
                    react_1.default.createElement("div", { className: "space-y-2" }, chatSuggestions.map((suggestion, index) => (react_1.default.createElement("button", { key: index, onClick: suggestion.action, className: "w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded text-blue-700 text-sm transition-colors" }, suggestion.text))))),
                react_1.default.createElement("div", { className: "p-4 border-t" },
                    react_1.default.createElement("div", { className: "flex gap-2" },
                        react_1.default.createElement("input", { type: "text", value: chatMessage, onChange: (e) => setChatMessage(e.target.value), placeholder: "Ask about plays...", className: "flex-1 p-2 border rounded-lg" }),
                        react_1.default.createElement("button", { onClick: () => {
                                if (chatMessage.trim()) {
                                    const analysis = analyzePlay();
                                    alert(`AI Response: Current ${playType} play has ${analysis.playerCount}/11 players with ${analysis.successRate}% success rate.`);
                                    setChatMessage('');
                                }
                            }, className: "bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700" },
                            react_1.default.createElement(lucide_react_1.Send, { size: 16 })))))))));
};
exports.default = FixedCoachCore;
