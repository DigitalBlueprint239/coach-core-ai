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
const react_1 = __importStar(require("react"));
const react_2 = require("@chakra-ui/react");
const lucide_react_1 = require("lucide-react");
const EnhancedPracticePlanner = () => {
    const [currentSession, setCurrentSession] = (0, react_1.useState)(null);
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [teamContext, setTeamContext] = (0, react_1.useState)({
        id: 'team-1',
        name: 'Wildcats Varsity',
        sport: 'Football',
        ageGroup: 'high_school',
        skillLevel: 'intermediate',
        playerCount: 45,
        seasonPhase: 'regular',
        recentPerformance: 'Improving - 3 wins in last 4 games',
        strengths: ['Passing game', 'Team chemistry', 'Conditioning'],
        weaknesses: ['Red zone efficiency', 'Penalty discipline', 'Deep ball accuracy']
    });
    const [generating, setGenerating] = (0, react_1.useState)(false);
    const [selectedFocus, setSelectedFocus] = (0, react_1.useState)([]);
    const [sessionDuration, setSessionDuration] = (0, react_1.useState)(120);
    const [difficulty, setDifficulty] = (0, react_1.useState)('intermediate');
    const [showAIInsights, setShowAIInsights] = (0, react_1.useState)(true);
    const { isOpen, onOpen, onClose } = (0, react_2.useDisclosure)();
    const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = (0, react_2.useDisclosure)();
    const toast = (0, react_2.useToast)();
    // Mock data for sessions
    (0, react_1.useEffect)(() => {
        setSessions([
            {
                id: '1',
                name: 'Passing Game Focus',
                duration: 120,
                focus: 'Passing accuracy and route running',
                difficulty: 'intermediate',
                equipment: ['Footballs', 'Cones', 'Stopwatch'],
                objectives: ['Improve QB accuracy', 'Enhance WR route running', 'Practice timing'],
                drills: [
                    {
                        id: 'drill-1',
                        name: 'QB Accuracy Challenge',
                        description: 'Quarterback throws to moving targets',
                        duration: 30,
                        category: 'Passing',
                        equipment: ['Football', 'Targets'],
                        instructions: ['Set up targets at various distances', 'QB throws from different positions'],
                        coachingPoints: ['Focus on footwork', 'Follow through', 'Eye on target'],
                        variations: ['Moving targets', 'Pressure simulation', 'Different distances'],
                        difficulty: 'intermediate',
                        aiReasoning: 'Based on QB Johnson\'s 78% completion rate and need for deep ball improvement',
                        successMetrics: ['Completion rate >80%', 'Target accuracy', 'Consistent form']
                    }
                ],
                aiGenerated: true,
                confidence: 0.89,
                createdAt: new Date(),
                lastModified: new Date(),
                createdBy: 'Coach Smith',
                shared: true,
                favorites: 12,
                rating: 4.5,
                tags: ['passing', 'quarterback', 'accuracy']
            }
        ]);
    }, []);
    const focusAreas = [
        'Passing Game',
        'Running Game',
        'Defense',
        'Special Teams',
        'Conditioning',
        'Team Building',
        'Strategy',
        'Skills Development'
    ];
    const equipmentOptions = [
        'Footballs',
        'Cones',
        'Tackling Dummies',
        'Agility Ladders',
        'Resistance Bands',
        'Stopwatch',
        'Whistle',
        'Whiteboard',
        'Tablets',
        'Video Camera'
    ];
    const generateAIPracticePlan = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        if (selectedFocus.length === 0) {
            toast({
                title: 'Focus Areas Required',
                description: 'Please select at least one focus area for the practice plan.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setGenerating(true);
        try {
            // Simulate AI generation
            yield new Promise(resolve => setTimeout(resolve, 3000));
            const newSession = {
                id: `session-${Date.now()}`,
                name: `AI Generated: ${selectedFocus.join(', ')} Focus`,
                duration: sessionDuration,
                focus: selectedFocus.join(', '),
                difficulty,
                equipment: equipmentOptions.slice(0, 3),
                objectives: [
                    `Improve ${selectedFocus[0].toLowerCase()}`,
                    'Enhance team coordination',
                    'Build confidence and skills'
                ],
                drills: [
                    {
                        id: `drill-${Date.now()}-1`,
                        name: 'Dynamic Warm-up',
                        description: 'Sport-specific warm-up routine',
                        duration: 15,
                        category: 'Warm-up',
                        equipment: ['Cones'],
                        instructions: ['Light jogging', 'Dynamic stretches', 'Sport-specific movements'],
                        coachingPoints: ['Focus on form', 'Gradual intensity increase', 'Team energy'],
                        variations: ['Different intensity levels', 'Weather adaptations'],
                        difficulty: 'beginner',
                        aiReasoning: 'Essential for injury prevention and performance optimization',
                        successMetrics: ['Heart rate elevation', 'Muscle activation', 'Team readiness']
                    },
                    {
                        id: `drill-${Date.now()}-2`,
                        name: `${selectedFocus[0]} Skill Development`,
                        description: `Focused ${selectedFocus[0].toLowerCase()} practice`,
                        duration: Math.floor(sessionDuration * 0.4),
                        category: selectedFocus[0],
                        equipment: ['Footballs', 'Cones'],
                        instructions: ['Skill-specific drills', 'Progressive difficulty', 'Individual attention'],
                        coachingPoints: ['Technique focus', 'Repetition quality', 'Positive reinforcement'],
                        variations: ['Different skill levels', 'Equipment variations'],
                        difficulty,
                        aiReasoning: `Targeted practice for ${selectedFocus[0].toLowerCase()} improvement based on team needs`,
                        successMetrics: ['Skill improvement', 'Confidence building', 'Technique consistency']
                    },
                    {
                        id: `drill-${Date.now()}-3`,
                        name: 'Team Integration',
                        description: 'Full team practice scenarios',
                        duration: Math.floor(sessionDuration * 0.3),
                        category: 'Team Practice',
                        equipment: ['Footballs', 'Cones', 'Stopwatch'],
                        instructions: ['Game-like scenarios', 'Team coordination', 'Strategy implementation'],
                        coachingPoints: ['Communication', 'Timing', 'Teamwork'],
                        variations: ['Different scenarios', 'Opponent simulation'],
                        difficulty,
                        aiReasoning: 'Essential for applying individual skills in team context',
                        successMetrics: ['Team coordination', 'Communication', 'Strategy execution']
                    }
                ],
                aiGenerated: true,
                confidence: 0.85 + Math.random() * 0.1,
                createdAt: new Date(),
                lastModified: new Date(),
                createdBy: 'AI Assistant',
                shared: false,
                favorites: 0,
                rating: 0,
                tags: selectedFocus.map(f => f.toLowerCase().replace(' ', '-'))
            };
            setSessions(prev => [newSession, ...prev]);
            setCurrentSession(newSession);
            toast({
                title: 'Practice Plan Generated!',
                description: `AI created a ${sessionDuration}-minute practice plan focused on ${selectedFocus.join(', ')}.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        }
        catch (error) {
            toast({
                title: 'Generation Failed',
                description: 'Failed to generate practice plan. Please try again.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
        finally {
            setGenerating(false);
        }
    }), [selectedFocus, sessionDuration, difficulty, toast]);
    const saveSession = (0, react_1.useCallback)(() => {
        if (!currentSession)
            return;
        setSessions(prev => prev.map(session => session.id === currentSession.id
            ? Object.assign(Object.assign({}, currentSession), { lastModified: new Date() }) : session));
        toast({
            title: 'Session Saved',
            description: 'Practice session has been saved successfully.',
            status: 'success',
            duration: 2000,
            isClosable: true,
        });
    }, [currentSession, toast]);
    const shareSession = (0, react_1.useCallback)(() => {
        if (!currentSession)
            return;
        setSessions(prev => prev.map(session => session.id === currentSession.id
            ? Object.assign(Object.assign({}, session), { shared: true }) : session));
        toast({
            title: 'Session Shared',
            description: 'Practice session has been shared with the team.',
            status: 'success',
            duration: 2000,
            isClosable: true,
        });
    }, [currentSession, toast]);
    const duplicateSession = (0, react_1.useCallback)((session) => {
        const duplicatedSession = Object.assign(Object.assign({}, session), { id: `session-${Date.now()}`, name: `${session.name} (Copy)`, createdAt: new Date(), lastModified: new Date(), shared: false, favorites: 0, rating: 0 });
        setSessions(prev => [duplicatedSession, ...prev]);
        setCurrentSession(duplicatedSession);
        toast({
            title: 'Session Duplicated',
            description: 'Practice session has been duplicated successfully.',
            status: 'success',
            duration: 2000,
            isClosable: true,
        });
    }, [toast]);
    return (react_1.default.createElement(react_2.Box, { minH: "100vh", bg: "gray.50", p: 6 },
        react_1.default.createElement(react_2.Box, { bg: "white", borderRadius: "lg", p: 6, mb: 6, shadow: "sm" },
            react_1.default.createElement(react_2.Flex, { justify: "space-between", align: "center" },
                react_1.default.createElement(react_2.HStack, null,
                    react_1.default.createElement(react_2.Icon, { as: lucide_react_1.Brain, color: "purple.600", boxSize: 8 }),
                    react_1.default.createElement(react_2.VStack, { align: "start", spacing: 0 },
                        react_1.default.createElement(react_2.Heading, { size: "lg", color: "purple.600" }, "Enhanced Practice Planner"),
                        react_1.default.createElement(react_2.Text, { fontSize: "sm", color: "gray.600" }, "AI-powered practice planning and management"))),
                react_1.default.createElement(react_2.HStack, { spacing: 4 },
                    react_1.default.createElement(react_2.HStack, null,
                        react_1.default.createElement(react_2.Icon, { as: lucide_react_1.Brain, color: showAIInsights ? "purple.500" : "gray.400" }),
                        react_1.default.createElement(react_2.Text, { fontSize: "sm" }, "AI Insights"),
                        react_1.default.createElement(react_2.Switch, { isChecked: showAIInsights, onChange: (e) => setShowAIInsights(e.target.checked), colorScheme: "purple" })),
                    react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Settings, null), colorScheme: "purple", variant: "outline", size: "sm", onClick: onSettingsOpen }, "Settings"),
                    react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Plus, null), colorScheme: "purple", size: "sm", onClick: onOpen }, "New Plan")))),
        react_1.default.createElement(react_2.Grid, { templateColumns: { base: "1fr", lg: "1fr 2fr" }, gap: 6 },
            react_1.default.createElement(react_2.VStack, { spacing: 6, align: "stretch" },
                react_1.default.createElement(react_2.Card, null,
                    react_1.default.createElement(react_2.CardHeader, null,
                        react_1.default.createElement(react_2.Heading, { size: "md" }, "Quick Actions")),
                    react_1.default.createElement(react_2.CardBody, null,
                        react_1.default.createElement(react_2.VStack, { spacing: 3 },
                            react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Sparkles, null), colorScheme: "purple", size: "sm", w: "full", onClick: onOpen }, "Generate AI Plan"),
                            react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Upload, null), colorScheme: "blue", size: "sm", w: "full" }, "Import Template"),
                            react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Download, null), colorScheme: "green", size: "sm", w: "full" }, "Export Plan")))),
                react_1.default.createElement(react_2.Card, null,
                    react_1.default.createElement(react_2.CardHeader, null,
                        react_1.default.createElement(react_2.Heading, { size: "md" }, "Practice Sessions")),
                    react_1.default.createElement(react_2.CardBody, null,
                        react_1.default.createElement(react_2.VStack, { spacing: 3, align: "stretch" }, sessions.map((session) => (react_1.default.createElement(react_2.Card, { key: session.id, p: 3, cursor: "pointer", border: (currentSession === null || currentSession === void 0 ? void 0 : currentSession.id) === session.id ? "2px solid" : "1px solid", borderColor: (currentSession === null || currentSession === void 0 ? void 0 : currentSession.id) === session.id ? "purple.500" : "gray.200", onClick: () => setCurrentSession(session), _hover: { shadow: "md" } },
                            react_1.default.createElement(react_2.VStack, { align: "start", spacing: 2 },
                                react_1.default.createElement(react_2.Flex, { justify: "space-between", w: "full" },
                                    react_1.default.createElement(react_2.Text, { fontWeight: "semibold", fontSize: "sm" }, session.name),
                                    react_1.default.createElement(react_2.Menu, null,
                                        react_1.default.createElement(react_2.MenuButton, { as: react_2.IconButton, icon: react_1.default.createElement(lucide_react_1.MoreVertical, null), variant: "ghost", size: "sm", onClick: (e) => e.stopPropagation() }),
                                        react_1.default.createElement(react_2.MenuList, null,
                                            react_1.default.createElement(react_2.MenuItem, { icon: react_1.default.createElement(lucide_react_1.Edit3, null) }, "Edit"),
                                            react_1.default.createElement(react_2.MenuItem, { icon: react_1.default.createElement(lucide_react_1.Copy, null), onClick: () => duplicateSession(session) }, "Duplicate"),
                                            react_1.default.createElement(react_2.MenuItem, { icon: react_1.default.createElement(lucide_react_1.Share, null) }, "Share"),
                                            react_1.default.createElement(react_2.MenuDivider, null),
                                            react_1.default.createElement(react_2.MenuItem, { icon: react_1.default.createElement(lucide_react_1.Trash2, null), color: "red.500" }, "Delete")))),
                                react_1.default.createElement(react_2.HStack, { spacing: 2 },
                                    react_1.default.createElement(react_2.Badge, { colorScheme: "blue", size: "sm" },
                                        session.duration,
                                        "min"),
                                    react_1.default.createElement(react_2.Badge, { colorScheme: "purple", size: "sm" }, session.difficulty),
                                    session.aiGenerated && (react_1.default.createElement(react_2.Badge, { colorScheme: "green", size: "sm" }, "AI"))),
                                react_1.default.createElement(react_2.Text, { fontSize: "xs", color: "gray.600", noOfLines: 2 }, session.focus),
                                react_1.default.createElement(react_2.HStack, { spacing: 2 },
                                    react_1.default.createElement(react_2.HStack, { spacing: 1 },
                                        react_1.default.createElement(react_2.Icon, { as: lucide_react_1.Star, size: 12, color: "yellow.500" }),
                                        react_1.default.createElement(react_2.Text, { fontSize: "xs" }, session.rating)),
                                    react_1.default.createElement(react_2.HStack, { spacing: 1 },
                                        react_1.default.createElement(react_2.Icon, { as: lucide_react_1.Heart, size: 12, color: "red.500" }),
                                        react_1.default.createElement(react_2.Text, { fontSize: "xs" }, session.favorites)),
                                    react_1.default.createElement(react_2.Text, { fontSize: "xs", color: "gray.500" }, session.lastModified.toLocaleDateString())))))))))),
            react_1.default.createElement(react_2.VStack, { spacing: 6, align: "stretch" }, currentSession ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(react_2.Card, null,
                    react_1.default.createElement(react_2.CardHeader, null,
                        react_1.default.createElement(react_2.Flex, { justify: "space-between", align: "center" },
                            react_1.default.createElement(react_2.VStack, { align: "start", spacing: 1 },
                                react_1.default.createElement(react_2.Heading, { size: "md" }, currentSession.name),
                                react_1.default.createElement(react_2.HStack, { spacing: 2 },
                                    react_1.default.createElement(react_2.Badge, { colorScheme: "blue" },
                                        currentSession.duration,
                                        " minutes"),
                                    react_1.default.createElement(react_2.Badge, { colorScheme: "purple" }, currentSession.difficulty),
                                    currentSession.aiGenerated && (react_1.default.createElement(react_2.Badge, { colorScheme: "green", leftIcon: react_1.default.createElement(lucide_react_1.Brain, null) }, "AI Generated")),
                                    react_1.default.createElement(react_2.Badge, { colorScheme: "orange" },
                                        (currentSession.confidence * 100).toFixed(0),
                                        "% confidence"))),
                            react_1.default.createElement(react_2.HStack, { spacing: 2 },
                                react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Save, null), colorScheme: "blue", size: "sm", onClick: saveSession }, "Save"),
                                react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Share, null), colorScheme: "green", size: "sm", onClick: shareSession }, "Share"),
                                react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Download, null), colorScheme: "purple", size: "sm" }, "Export")))),
                    react_1.default.createElement(react_2.CardBody, null,
                        react_1.default.createElement(react_2.VStack, { spacing: 4, align: "stretch" },
                            react_1.default.createElement(react_2.Box, null,
                                react_1.default.createElement(react_2.Text, { fontWeight: "semibold", mb: 2 }, "Focus Areas"),
                                react_1.default.createElement(react_2.HStack, { spacing: 2, flexWrap: "wrap" }, currentSession.tags.map((tag) => (react_1.default.createElement(react_2.Tag, { key: tag, colorScheme: "purple", size: "sm" },
                                    react_1.default.createElement(react_2.TagLabel, null, tag)))))),
                            react_1.default.createElement(react_2.Box, null,
                                react_1.default.createElement(react_2.Text, { fontWeight: "semibold", mb: 2 }, "Objectives"),
                                react_1.default.createElement(react_2.List, { spacing: 2 }, currentSession.objectives.map((objective, index) => (react_1.default.createElement(react_2.ListItem, { key: index },
                                    react_1.default.createElement(react_2.ListIcon, { as: lucide_react_1.CheckCircle, color: "green.500" }),
                                    objective))))),
                            react_1.default.createElement(react_2.Box, null,
                                react_1.default.createElement(react_2.Text, { fontWeight: "semibold", mb: 2 }, "Equipment Needed"),
                                react_1.default.createElement(react_2.HStack, { spacing: 2, flexWrap: "wrap" }, currentSession.equipment.map((item) => (react_1.default.createElement(react_2.Tag, { key: item, colorScheme: "blue", size: "sm" },
                                    react_1.default.createElement(react_2.TagLabel, null, item))))))))),
                react_1.default.createElement(react_2.Card, null,
                    react_1.default.createElement(react_2.CardHeader, null,
                        react_1.default.createElement(react_2.Heading, { size: "md" }, "Practice Drills")),
                    react_1.default.createElement(react_2.CardBody, null,
                        react_1.default.createElement(react_2.Accordion, { allowMultiple: true }, currentSession.drills.map((drill, index) => (react_1.default.createElement(react_2.AccordionItem, { key: drill.id },
                            react_1.default.createElement(react_2.AccordionButton, null,
                                react_1.default.createElement(react_2.Box, { flex: "1", textAlign: "left" },
                                    react_1.default.createElement(react_2.Flex, { justify: "space-between", align: "center" },
                                        react_1.default.createElement(react_2.VStack, { align: "start", spacing: 0 },
                                            react_1.default.createElement(react_2.Text, { fontWeight: "semibold" }, drill.name),
                                            react_1.default.createElement(react_2.HStack, { spacing: 2 },
                                                react_1.default.createElement(react_2.Badge, { colorScheme: "blue", size: "sm" },
                                                    drill.duration,
                                                    "min"),
                                                react_1.default.createElement(react_2.Badge, { colorScheme: "purple", size: "sm" }, drill.category),
                                                react_1.default.createElement(react_2.Badge, { colorScheme: "orange", size: "sm" }, drill.difficulty))))),
                                react_1.default.createElement(react_2.AccordionIcon, null)),
                            react_1.default.createElement(react_2.AccordionPanel, { pb: 4 },
                                react_1.default.createElement(react_2.VStack, { spacing: 4, align: "stretch" },
                                    react_1.default.createElement(react_2.Text, null, drill.description),
                                    showAIInsights && drill.aiReasoning && (react_1.default.createElement(react_2.Alert, { status: "info", borderRadius: "md" },
                                        react_1.default.createElement(react_2.AlertIcon, null),
                                        react_1.default.createElement(react_2.Box, null,
                                            react_1.default.createElement(react_2.AlertTitle, null, "AI Reasoning"),
                                            react_1.default.createElement(react_2.AlertDescription, null, drill.aiReasoning)))),
                                    react_1.default.createElement(react_2.Box, null,
                                        react_1.default.createElement(react_2.Text, { fontWeight: "semibold", mb: 2 }, "Instructions"),
                                        react_1.default.createElement(react_2.List, { spacing: 1 }, drill.instructions.map((instruction, idx) => (react_1.default.createElement(react_2.ListItem, { key: idx, fontSize: "sm" },
                                            idx + 1,
                                            ". ",
                                            instruction))))),
                                    react_1.default.createElement(react_2.Box, null,
                                        react_1.default.createElement(react_2.Text, { fontWeight: "semibold", mb: 2 }, "Coaching Points"),
                                        react_1.default.createElement(react_2.List, { spacing: 1 }, drill.coachingPoints.map((point, idx) => (react_1.default.createElement(react_2.ListItem, { key: idx, fontSize: "sm" },
                                            "\u2022 ",
                                            point))))),
                                    react_1.default.createElement(react_2.Box, null,
                                        react_1.default.createElement(react_2.Text, { fontWeight: "semibold", mb: 2 }, "Success Metrics"),
                                        react_1.default.createElement(react_2.HStack, { spacing: 2, flexWrap: "wrap" }, drill.successMetrics.map((metric) => (react_1.default.createElement(react_2.Tag, { key: metric, colorScheme: "green", size: "sm" },
                                            react_1.default.createElement(react_2.TagLabel, null, metric)))))),
                                    react_1.default.createElement(react_2.HStack, { spacing: 2 },
                                        drill.videoUrl && (react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Video, null), size: "sm", variant: "outline" }, "Watch Video")),
                                        drill.imageUrl && (react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Image, null), size: "sm", variant: "outline" }, "View Image"))))))))))))) : (react_1.default.createElement(react_2.Card, null,
                react_1.default.createElement(react_2.CardBody, null,
                    react_1.default.createElement(react_2.VStack, { spacing: 4, textAlign: "center" },
                        react_1.default.createElement(react_2.Icon, { as: lucide_react_1.Brain, color: "purple.500", boxSize: 16 }),
                        react_1.default.createElement(react_2.Heading, { size: "md", color: "purple.600" }, "No Practice Session Selected"),
                        react_1.default.createElement(react_2.Text, { color: "gray.600" }, "Select a practice session from the library or create a new AI-generated plan."),
                        react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Plus, null), colorScheme: "purple", onClick: onOpen }, "Create New Plan"))))))),
        react_1.default.createElement(react_2.Modal, { isOpen: isOpen, onClose: onClose, size: "xl" },
            react_1.default.createElement(react_2.ModalOverlay, null),
            react_1.default.createElement(react_2.ModalContent, null,
                react_1.default.createElement(react_2.ModalHeader, null, "Generate AI Practice Plan"),
                react_1.default.createElement(react_2.ModalCloseButton, null),
                react_1.default.createElement(react_2.ModalBody, { pb: 6 },
                    react_1.default.createElement(react_2.VStack, { spacing: 6, align: "stretch" },
                        react_1.default.createElement(react_2.Box, null,
                            react_1.default.createElement(react_2.FormLabel, { fontWeight: "semibold" }, "Focus Areas"),
                            react_1.default.createElement(react_2.CheckboxGroup, { value: selectedFocus, onChange: (values) => setSelectedFocus(values) },
                                react_1.default.createElement(react_2.Grid, { templateColumns: "repeat(2, 1fr)", gap: 3 }, focusAreas.map((area) => (react_1.default.createElement(react_2.Checkbox, { key: area, value: area }, area)))))),
                        react_1.default.createElement(react_2.HStack, { spacing: 4 },
                            react_1.default.createElement(react_2.FormControl, null,
                                react_1.default.createElement(react_2.FormLabel, null, "Session Duration (minutes)"),
                                react_1.default.createElement(react_2.NumberInput, { value: sessionDuration, onChange: (_, value) => setSessionDuration(value), min: 30, max: 180, step: 15 },
                                    react_1.default.createElement(react_2.NumberInputField, null),
                                    react_1.default.createElement(react_2.NumberInputStepper, null,
                                        react_1.default.createElement(react_2.NumberIncrementStepper, null),
                                        react_1.default.createElement(react_2.NumberDecrementStepper, null)))),
                            react_1.default.createElement(react_2.FormControl, null,
                                react_1.default.createElement(react_2.FormLabel, null, "Difficulty Level"),
                                react_1.default.createElement(react_2.RadioGroup, { value: difficulty, onChange: (value) => setDifficulty(value) },
                                    react_1.default.createElement(react_2.Stack, { direction: "row" },
                                        react_1.default.createElement(react_2.Radio, { value: "beginner" }, "Beginner"),
                                        react_1.default.createElement(react_2.Radio, { value: "intermediate" }, "Intermediate"),
                                        react_1.default.createElement(react_2.Radio, { value: "advanced" }, "Advanced"))))),
                        react_1.default.createElement(react_2.Box, null,
                            react_1.default.createElement(react_2.FormLabel, { fontWeight: "semibold" }, "Team Context"),
                            react_1.default.createElement(react_2.Card, { p: 4, bg: "gray.50" },
                                react_1.default.createElement(react_2.VStack, { align: "start", spacing: 2 },
                                    react_1.default.createElement(react_2.Text, null,
                                        react_1.default.createElement("strong", null, "Team:"),
                                        " ",
                                        teamContext.name),
                                    react_1.default.createElement(react_2.Text, null,
                                        react_1.default.createElement("strong", null, "Sport:"),
                                        " ",
                                        teamContext.sport),
                                    react_1.default.createElement(react_2.Text, null,
                                        react_1.default.createElement("strong", null, "Age Group:"),
                                        " ",
                                        teamContext.ageGroup),
                                    react_1.default.createElement(react_2.Text, null,
                                        react_1.default.createElement("strong", null, "Skill Level:"),
                                        " ",
                                        teamContext.skillLevel),
                                    react_1.default.createElement(react_2.Text, null,
                                        react_1.default.createElement("strong", null, "Players:"),
                                        " ",
                                        teamContext.playerCount)))),
                        react_1.default.createElement(react_2.Button, { leftIcon: react_1.default.createElement(lucide_react_1.Sparkles, null), colorScheme: "purple", size: "lg", onClick: generateAIPracticePlan, isLoading: generating, loadingText: "AI Generating Plan...", isDisabled: selectedFocus.length === 0 }, "Generate Practice Plan"))))),
        react_1.default.createElement(react_2.Modal, { isOpen: isSettingsOpen, onClose: onSettingsClose, size: "lg" },
            react_1.default.createElement(react_2.ModalOverlay, null),
            react_1.default.createElement(react_2.ModalContent, null,
                react_1.default.createElement(react_2.ModalHeader, null, "Practice Planner Settings"),
                react_1.default.createElement(react_2.ModalCloseButton, null),
                react_1.default.createElement(react_2.ModalBody, { pb: 6 },
                    react_1.default.createElement(react_2.Tabs, null,
                        react_1.default.createElement(react_2.TabList, null,
                            react_1.default.createElement(react_2.Tab, null, "AI Settings"),
                            react_1.default.createElement(react_2.Tab, null, "Preferences"),
                            react_1.default.createElement(react_2.Tab, null, "Team")),
                        react_1.default.createElement(react_2.TabPanels, null,
                            react_1.default.createElement(react_2.TabPanel, null,
                                react_1.default.createElement(react_2.VStack, { spacing: 4, align: "stretch" },
                                    react_1.default.createElement(react_2.FormControl, { display: "flex", alignItems: "center" },
                                        react_1.default.createElement(react_2.FormLabel, { mb: "0" }, "Enable AI Insights"),
                                        react_1.default.createElement(react_2.Switch, { isChecked: showAIInsights, onChange: (e) => setShowAIInsights(e.target.checked) })),
                                    react_1.default.createElement(react_2.FormControl, null,
                                        react_1.default.createElement(react_2.FormLabel, null, "Default Session Duration (minutes)"),
                                        react_1.default.createElement(react_2.NumberInput, { defaultValue: 120, min: 30, max: 180 },
                                            react_1.default.createElement(react_2.NumberInputField, null),
                                            react_1.default.createElement(react_2.NumberInputStepper, null,
                                                react_1.default.createElement(react_2.NumberIncrementStepper, null),
                                                react_1.default.createElement(react_2.NumberDecrementStepper, null)))),
                                    react_1.default.createElement(react_2.FormControl, null,
                                        react_1.default.createElement(react_2.FormLabel, null, "Default Difficulty"),
                                        react_1.default.createElement(react_2.Select, { defaultValue: "intermediate" },
                                            react_1.default.createElement("option", { value: "beginner" }, "Beginner"),
                                            react_1.default.createElement("option", { value: "intermediate" }, "Intermediate"),
                                            react_1.default.createElement("option", { value: "advanced" }, "Advanced"))))),
                            react_1.default.createElement(react_2.TabPanel, null,
                                react_1.default.createElement(react_2.VStack, { spacing: 4, align: "stretch" },
                                    react_1.default.createElement(react_2.FormControl, { display: "flex", alignItems: "center" },
                                        react_1.default.createElement(react_2.FormLabel, { mb: "0" }, "Auto-save sessions"),
                                        react_1.default.createElement(react_2.Switch, { defaultChecked: true })),
                                    react_1.default.createElement(react_2.FormControl, { display: "flex", alignItems: "center" },
                                        react_1.default.createElement(react_2.FormLabel, { mb: "0" }, "Show AI confidence scores"),
                                        react_1.default.createElement(react_2.Switch, { defaultChecked: true })),
                                    react_1.default.createElement(react_2.FormControl, { display: "flex", alignItems: "center" },
                                        react_1.default.createElement(react_2.FormLabel, { mb: "0" }, "Enable session sharing"),
                                        react_1.default.createElement(react_2.Switch, { defaultChecked: true })))),
                            react_1.default.createElement(react_2.TabPanel, null,
                                react_1.default.createElement(react_2.VStack, { spacing: 4, align: "stretch" },
                                    react_1.default.createElement(react_2.FormControl, null,
                                        react_1.default.createElement(react_2.FormLabel, null, "Team Name"),
                                        react_1.default.createElement(react_2.Input, { defaultValue: teamContext.name })),
                                    react_1.default.createElement(react_2.FormControl, null,
                                        react_1.default.createElement(react_2.FormLabel, null, "Sport"),
                                        react_1.default.createElement(react_2.Select, { defaultValue: teamContext.sport },
                                            react_1.default.createElement("option", { value: "Football" }, "Football"),
                                            react_1.default.createElement("option", { value: "Basketball" }, "Basketball"),
                                            react_1.default.createElement("option", { value: "Soccer" }, "Soccer"),
                                            react_1.default.createElement("option", { value: "Baseball" }, "Baseball"))),
                                    react_1.default.createElement(react_2.FormControl, null,
                                        react_1.default.createElement(react_2.FormLabel, null, "Age Group"),
                                        react_1.default.createElement(react_2.Select, { defaultValue: teamContext.ageGroup },
                                            react_1.default.createElement("option", { value: "youth" }, "Youth"),
                                            react_1.default.createElement("option", { value: "middle_school" }, "Middle School"),
                                            react_1.default.createElement("option", { value: "high_school" }, "High School"),
                                            react_1.default.createElement("option", { value: "college" }, "College"))))))))))));
};
exports.default = EnhancedPracticePlanner;
