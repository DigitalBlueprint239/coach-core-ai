"use strict";
// src/components/ui/MobileDrillSelector.tsx
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileDrillSelector = void 0;
const react_1 = __importStar(require("react"));
const TouchableOpacity_1 = require("./TouchableOpacity");
const SwipeGesture_1 = require("./SwipeGesture");
const haptics_1 = require("@capacitor/haptics");
const MobileDrillSelector = ({ drills, selectedDrills, onDrillSelect, onDrillDeselect, onDrillAdd, onDrillDelete, onDrillEdit, className = '', style = {}, }) => {
    const [activeCategory, setActiveCategory] = (0, react_1.useState)('warmup');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [showAddDrill, setShowAddDrill] = (0, react_1.useState)(false);
    const [showDrillDetails, setShowDrillDetails] = (0, react_1.useState)(null);
    const [dragState, setDragState] = (0, react_1.useState)({
        isDragging: false,
        drillId: null,
    });
    const containerRef = (0, react_1.useRef)(null);
    const searchInputRef = (0, react_1.useRef)(null);
    // ============================================
    // FILTERED DRILLS
    // ============================================
    const filteredDrills = drills.filter(drill => {
        const matchesCategory = drill.category === activeCategory;
        const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            drill.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
    const categories = ['warmup', 'skill', 'tactical', 'conditioning'];
    // ============================================
    // HAPTIC FEEDBACK
    // ============================================
    const triggerHapticFeedback = (0, react_1.useCallback)((type) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            switch (type) {
                case 'light':
                    yield haptics_1.Haptics.impact({ style: 'light' });
                    break;
                case 'medium':
                    yield haptics_1.Haptics.impact({ style: 'medium' });
                    break;
                case 'success':
                    yield haptics_1.Haptics.notification({ type: 'success' });
                    break;
                case 'error':
                    yield haptics_1.Haptics.notification({ type: 'error' });
                    break;
            }
        }
        catch (error) {
            console.warn('Haptic feedback not available:', error);
        }
    }), []);
    // ============================================
    // DRILL SELECTION HANDLERS
    // ============================================
    const handleDrillToggle = (0, react_1.useCallback)((drillId) => {
        if (selectedDrills.includes(drillId)) {
            onDrillDeselect(drillId);
            triggerHapticFeedback('light');
        }
        else {
            onDrillSelect(drillId);
            triggerHapticFeedback('success');
        }
    }, [selectedDrills, onDrillSelect, onDrillDeselect, triggerHapticFeedback]);
    const handleDrillLongPress = (0, react_1.useCallback)((drillId) => {
        setShowDrillDetails(drillId);
        triggerHapticFeedback('medium');
    }, [triggerHapticFeedback]);
    const handleDrillDelete = (0, react_1.useCallback)((drillId) => {
        onDrillDelete(drillId);
        setShowDrillDetails(null);
        triggerHapticFeedback('success');
    }, [onDrillDelete, triggerHapticFeedback]);
    const handleDrillEdit = (0, react_1.useCallback)((drill) => {
        onDrillEdit(drill);
        setShowDrillDetails(null);
        triggerHapticFeedback('light');
    }, [onDrillEdit, triggerHapticFeedback]);
    // ============================================
    // CATEGORY NAVIGATION
    // ============================================
    const handleCategoryChange = (0, react_1.useCallback)((category) => {
        setActiveCategory(category);
        triggerHapticFeedback('light');
    }, [triggerHapticFeedback]);
    const handleSwipeCategory = (0, react_1.useCallback)((direction) => {
        const currentIndex = categories.indexOf(activeCategory);
        let newIndex;
        if (direction === 'left') {
            newIndex = (currentIndex + 1) % categories.length;
        }
        else {
            newIndex = (currentIndex - 1 + categories.length) % categories.length;
        }
        setActiveCategory(categories[newIndex]);
        triggerHapticFeedback('light');
    }, [activeCategory, categories, triggerHapticFeedback]);
    // ============================================
    // SEARCH HANDLERS
    // ============================================
    const handleSearchFocus = (0, react_1.useCallback)(() => {
        triggerHapticFeedback('light');
    }, [triggerHapticFeedback]);
    const handleSearchChange = (0, react_1.useCallback)((event) => {
        setSearchQuery(event.target.value);
    }, []);
    const handleSearchClear = (0, react_1.useCallback)(() => {
        var _a;
        setSearchQuery('');
        (_a = searchInputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        triggerHapticFeedback('light');
    }, [triggerHapticFeedback]);
    // ============================================
    // ADD DRILL HANDLERS
    // ============================================
    const handleAddDrill = (0, react_1.useCallback)(() => {
        setShowAddDrill(true);
        triggerHapticFeedback('light');
    }, [triggerHapticFeedback]);
    const handleCreateDrill = (0, react_1.useCallback)((drillData) => {
        const newDrill = Object.assign({ id: `drill_${Date.now()}`, name: drillData.name || 'New Drill', description: drillData.description || '', category: drillData.category || 'warmup', duration: drillData.duration || 10, difficulty: drillData.difficulty || 'beginner', equipment: drillData.equipment || [], instructions: drillData.instructions || [] }, drillData);
        onDrillAdd(newDrill);
        setShowAddDrill(false);
        triggerHapticFeedback('success');
    }, [onDrillAdd, triggerHapticFeedback]);
    // ============================================
    // PULL TO REFRESH
    // ============================================
    const handlePullToRefresh = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        // Simulate data refresh
        yield new Promise(resolve => setTimeout(resolve, 1000));
        triggerHapticFeedback('success');
    }), [triggerHapticFeedback]);
    // ============================================
    // RENDER HELPERS
    // ============================================
    const getCategoryIcon = (0, react_1.useCallback)((category) => {
        switch (category) {
            case 'warmup':
                return '🔥';
            case 'skill':
                return '⚽';
            case 'tactical':
                return '🎯';
            case 'conditioning':
                return '💪';
            default:
                return '🏈';
        }
    }, []);
    const getDifficultyColor = (0, react_1.useCallback)((difficulty) => {
        switch (difficulty) {
            case 'beginner':
                return '#34C759';
            case 'intermediate':
                return '#FF9500';
            case 'advanced':
                return '#FF3B30';
            default:
                return '#007AFF';
        }
    }, []);
    // ============================================
    // RENDER
    // ============================================
    return (react_1.default.createElement("div", { ref: containerRef, className: `mobile-drill-selector ${className}`, style: Object.assign({ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8F9FA' }, style) },
        react_1.default.createElement("div", { className: "drill-selector-header", style: {
                backgroundColor: '#FFFFFF',
                padding: '16px',
                borderBottom: '1px solid #E5E5E7',
            } },
            react_1.default.createElement("div", { className: "search-container", style: {
                    position: 'relative',
                    marginBottom: '12px',
                } },
                react_1.default.createElement("input", { ref: searchInputRef, type: "text", placeholder: "Search drills...", value: searchQuery, onChange: handleSearchChange, onFocus: handleSearchFocus, style: {
                        width: '100%',
                        padding: '12px 40px 12px 16px',
                        border: '1px solid #E5E5E7',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: '#F8F9FA',
                    } }),
                searchQuery && (react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: handleSearchClear, style: {
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        backgroundColor: '#C7C7CC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '12px',
                    }, hapticFeedback: "light" }, "\u00D7"))),
            react_1.default.createElement(SwipeGesture_1.SwipeGesture, { onSwipeLeft: () => handleSwipeCategory('left'), onSwipeRight: () => handleSwipeCategory('right'), enableSwipeNavigation: true, style: {
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                } }, categories.map(category => (react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { key: category, onPress: () => handleCategoryChange(category), style: {
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: activeCategory === category ? '#007AFF' : '#F0F0F0',
                    color: activeCategory === category ? '#FFFFFF' : '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }, hapticFeedback: "light" },
                react_1.default.createElement("span", null, getCategoryIcon(category)),
                react_1.default.createElement("span", { style: { textTransform: 'capitalize' } }, category)))))),
        react_1.default.createElement(SwipeGesture_1.SwipeGesture, { onPullToRefresh: handlePullToRefresh, enablePullToRefresh: true, style: {
                flex: 1,
                overflowY: 'auto',
            } },
            react_1.default.createElement("div", { className: "drill-list", style: {
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                } },
                filteredDrills.map(drill => (react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { key: drill.id, onPress: () => handleDrillToggle(drill.id), onLongPress: () => handleDrillLongPress(drill.id), style: {
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '16px',
                        border: selectedDrills.includes(drill.id) ? '2px solid #007AFF' : '1px solid #E5E5E7',
                        position: 'relative',
                        overflow: 'hidden',
                    }, hapticFeedback: selectedDrills.includes(drill.id) ? 'success' : 'light' },
                    selectedDrills.includes(drill.id) && (react_1.default.createElement("div", { style: {
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '12px',
                            backgroundColor: '#007AFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontSize: '12px',
                        } }, "\u2713")),
                    react_1.default.createElement("div", { style: { display: 'flex', gap: '12px' } },
                        react_1.default.createElement("div", { style: {
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                backgroundColor: '#F0F0F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                            } }, drill.thumbnail ? (react_1.default.createElement("img", { src: drill.thumbnail, alt: drill.name, style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' } })) : (getCategoryIcon(drill.category))),
                        react_1.default.createElement("div", { style: { flex: 1 } },
                            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
                                react_1.default.createElement("h3", { style: { margin: 0, fontSize: '16px', fontWeight: '600' } }, drill.name),
                                react_1.default.createElement("span", { style: {
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: getDifficultyColor(drill.difficulty),
                                        color: '#FFFFFF',
                                    } }, drill.difficulty)),
                            react_1.default.createElement("p", { style: { margin: 0, fontSize: '14px', color: '#666666', marginBottom: '8px' } }, drill.description),
                            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                                react_1.default.createElement("span", { style: { fontSize: '12px', color: '#666666' } },
                                    "\u23F1\uFE0F ",
                                    drill.duration,
                                    " min"),
                                drill.equipment.length > 0 && (react_1.default.createElement("span", { style: { fontSize: '12px', color: '#666666' } },
                                    "\uD83C\uDFC8 ",
                                    drill.equipment.length,
                                    " items")))))))),
                react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: handleAddDrill, style: {
                        backgroundColor: '#F0F0F0',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '2px dashed #C7C7CC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#666666',
                        fontSize: '16px',
                        fontWeight: '500',
                    }, hapticFeedback: "light" },
                    react_1.default.createElement("span", { style: { fontSize: '20px' } }, "+"),
                    react_1.default.createElement("span", null, "Add New Drill")))),
        showDrillDetails && (react_1.default.createElement("div", { style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            } },
            react_1.default.createElement("div", { style: {
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    margin: '20px',
                    maxWidth: '400px',
                    width: '100%',
                } },
                react_1.default.createElement("h3", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' } }, "Drill Options"),
                react_1.default.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                    react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => handleDrillEdit(drills.find(d => d.id === showDrillDetails)), style: {
                            padding: '12px 16px',
                            backgroundColor: '#007AFF',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                        }, hapticFeedback: "light" }, "Edit Drill"),
                    react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => handleDrillDelete(showDrillDetails), style: {
                            padding: '12px 16px',
                            backgroundColor: '#FF3B30',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                        }, hapticFeedback: "medium" }, "Delete Drill"),
                    react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => setShowDrillDetails(null), style: {
                            padding: '12px 16px',
                            backgroundColor: '#F0F0F0',
                            color: '#000000',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                        }, hapticFeedback: "light" }, "Cancel"))))),
        showAddDrill && (react_1.default.createElement("div", { style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            } },
            react_1.default.createElement("div", { style: {
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    margin: '20px',
                    maxWidth: '400px',
                    width: '100%',
                } },
                react_1.default.createElement("h3", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' } }, "Create New Drill"),
                react_1.default.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                    react_1.default.createElement("input", { type: "text", placeholder: "Drill name", style: {
                            padding: '12px 16px',
                            border: '1px solid #E5E5E7',
                            borderRadius: '8px',
                            fontSize: '16px',
                        } }),
                    react_1.default.createElement("textarea", { placeholder: "Description", style: {
                            padding: '12px 16px',
                            border: '1px solid #E5E5E7',
                            borderRadius: '8px',
                            fontSize: '16px',
                            minHeight: '80px',
                            resize: 'vertical',
                        } }),
                    react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => handleCreateDrill({ name: 'New Drill', description: 'Drill description' }), style: {
                            padding: '12px 16px',
                            backgroundColor: '#007AFF',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                        }, hapticFeedback: "success" }, "Create Drill"),
                    react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => setShowAddDrill(false), style: {
                            padding: '12px 16px',
                            backgroundColor: '#F0F0F0',
                            color: '#000000',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                        }, hapticFeedback: "light" }, "Cancel")))))));
};
exports.MobileDrillSelector = MobileDrillSelector;
// ============================================
// EXPORT
// ============================================
exports.default = exports.MobileDrillSelector;
