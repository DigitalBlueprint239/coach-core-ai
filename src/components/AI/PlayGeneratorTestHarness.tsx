import React, { Component, ErrorInfo, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  Star,
  StarOff,
  Trophy,
} from 'lucide-react';
import aiService from '../../services/ai/ai-service';
import { GeneratedPlay } from '../../services/ai/types';
import { PLAY_SCENARIOS, PlayScenario } from '../../test/play-scenarios';
import { PlayValidationSummary, validatePlayCall } from '../../utils/play-validator';

interface PlayGeneratorTestHarnessProps {
  enabled?: boolean;
  autoStart?: boolean;
}

interface HarnessState {
  scenarioId: string;
  isGenerating: boolean;
  error: string | null;
  play: GeneratedPlay | null;
  validation: PlayValidationSummary | null;
  isFallback: boolean;
  rating: number | null;
}

class HarnessErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('PlayGeneratorTestHarness crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card bg="red.50" borderColor="red.200" borderWidth="1px">
          <CardBody>
            <HStack spacing={3} color="red.600">
              <Icon as={ShieldAlert} />
              <Text>Play generator harness encountered an unrecoverable error. Refresh to retry.</Text>
            </HStack>
          </CardBody>
        </Card>
      );
    }
    return this.props.children;
  }
}

const isDevEnvironment = process.env.NODE_ENV !== 'production';

const initialState = (initialScenarioId: string): HarnessState => ({
  scenarioId: initialScenarioId,
  isGenerating: false,
  error: null,
  play: null,
  validation: null,
  isFallback: false,
  rating: null,
});

const DEFAULT_FALLBACK_PLAY = (
  scenario: PlayScenario,
  override?: Partial<GeneratedPlay>
): GeneratedPlay => ({
  id: `fallback-${scenario.id}-${Date.now()}`,
  name: 'Fallback Motion Set',
  description:
    'Maintain spacing with a high ball screen into drive and kick. Emphasize safe decision making when primary look is denied.',
  formation: '4-out 1-in',
  positions: [
    { position: 'Point Guard', movement: 'Initiate high PnR to strong side', responsibility: 'Read hedge and attack seam' },
    { position: 'Shooting Guard', movement: 'Start weak-side slot, lift to wing', responsibility: 'Catch-ready for kick-out three' },
    { position: 'Small Forward', movement: 'Corner spacing, shake to slot on drive', responsibility: 'Provide secondary outlet' },
    { position: 'Power Forward', movement: 'Screen then short roll to nail', responsibility: 'Be ready for pocket pass' },
    { position: 'Center', movement: 'Dunker spot, seal help defender', responsibility: 'Finish dump-offs, crash boards' },
  ],
  coachingPoints: [
    'PG uses screen at 8 on the shot clock—attack downhill with pace.',
    'Weak-side wing drifts to corner for clear passing lane.',
    'Roll man sits in pocket; hit short roll if defense traps.',
    'Corner opposite lifts to slot for reversal safety valve.',
    'Reset if nothing clean—swing to second side within 3 seconds.',
  ],
  variations: ['If defense switches, feed post mismatch immediately.', 'If trap comes, reverse quickly to opposite wing for open look.'],
  adjustments: ['On zone, align in 1-3-1 overload with same timing cues.'],
  keySuccessFactors: ['Strong screen contact', 'Quick reads under pressure', 'Maintain floor balance'],
  confidence: 0.55,
  ...override,
});

export const DEFAULT_FALLBACK_PLAY = (
  scenario: PlayScenario,
  override?: Partial<GeneratedPlay>
): GeneratedPlay => ({
  id: `fallback-${scenario.id}-${Date.now()}`,
  name: 'Fallback Motion Set',
  description:
    'Maintain spacing with a high ball screen into drive and kick. Emphasize safe decision making when primary look is denied.',
  formation: '4-out 1-in',
  positions: [
    { position: 'Point Guard', movement: 'Initiate high PnR to strong side', responsibility: 'Read hedge and attack seam' },
    { position: 'Shooting Guard', movement: 'Start weak-side slot, lift to wing', responsibility: 'Catch-ready for kick-out three' },
    { position: 'Small Forward', movement: 'Corner spacing, shake to slot on drive', responsibility: 'Provide secondary outlet' },
    { position: 'Power Forward', movement: 'Screen then short roll to nail', responsibility: 'Be ready for pocket pass' },
    { position: 'Center', movement: 'Dunker spot, seal help defender', responsibility: 'Finish dump-offs, crash boards' },
  ],
  coachingPoints: [
    'PG uses screen at 8 on the shot clock—attack downhill with pace.',
    'Weak-side wing drifts to corner for clear passing lane.',
    'Roll man sits in pocket; hit short roll if defense traps.',
    'Corner opposite lifts to slot for reversal safety valve.',
    'Reset if nothing clean—swing to second side within 3 seconds.',
  ],
  variations: ['If defense switches, feed post mismatch immediately.', 'If trap comes, reverse quickly to opposite wing for open look.'],
  adjustments: ['On zone, align in 1-3-1 overload with same timing cues.'],
  keySuccessFactors: ['Strong screen contact', 'Quick reads under pressure', 'Maintain floor balance'],
  confidence: 0.55,
  ...override,
});

export const PlayGeneratorTestHarness: React.FC<PlayGeneratorTestHarnessProps> = ({
  enabled,
  autoStart = false,
}) => {
  const allowRender = enabled ?? isDevEnvironment;
  const [state, setState] = useState<HarnessState>(() => initialState(PLAY_SCENARIOS[0]?.id ?? ''));
  const [forceOffline, setForceOffline] = useState<boolean>(false);
  const [debug, setDebug] = useState<boolean>(false);

  const scenario = useMemo<PlayScenario | undefined>(
    () => PLAY_SCENARIOS.find(item => item.id === state.scenarioId),
    [state.scenarioId]
  );

  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');
  const jsonBg = useColorModeValue('gray.100', 'gray.700');
  const drillBg = useColorModeValue('gray.50', 'gray.700');

  const logDebug = (label: string, payload: unknown) => {
    if (debug) {
      // eslint-disable-next-line no-console
      console.debug(`[PlayGeneratorTestHarness] ${label}`, payload);
    }
  };

  const handleScenarioChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newScenarioId = event.target.value;
    setState(prev => ({ ...prev, scenarioId: newScenarioId, error: null, play: null, validation: null, rating: null }));
  };

  const runGeneration = async (currentScenario: PlayScenario, offline: boolean) => {
    setState(prev => ({ ...prev, isGenerating: true, error: null, play: null, validation: null, isFallback: false }));

    try {
      const { teamProfile, requirements } = currentScenario;

      let response: { success: boolean; play?: GeneratedPlay; fallback?: boolean };

      if (offline) {
        response = { success: true, play: DEFAULT_FALLBACK_PLAY(currentScenario), fallback: true };
        logDebug('Offline fallback response', response);
      } else {
        logDebug('AI request', { teamProfile, requirements });
        response = await aiService.generateCustomPlay(teamProfile, requirements);
        logDebug('AI response', response);
      }

      if (!response.success || !response.play) {
        throw new Error('AI service did not return a play call.');
      }

      const validation = validatePlayCall(response.play, currentScenario);
      logDebug('Validation summary', validation);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        play: response.play ?? null,
        validation,
        isFallback: Boolean(response.fallback) || offline,
        rating: prev.rating ?? null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error during play generation.';
      setState(prev => ({ ...prev, isGenerating: false, error: message, play: null, validation: null, isFallback: false }));
      logDebug('Generation error', err);
    }
  };

  const handleGenerate = () => {
    if (!scenario) {
      setState(prev => ({ ...prev, error: 'Scenario not found. Please select a different option.' }));
      return;
    }
    void runGeneration(scenario, forceOffline);
  };

  React.useEffect(() => {
    if (autoStart && scenario) {
      void runGeneration(scenario, forceOffline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, state.scenarioId]);

  if (!allowRender) {
    return null;
  }

  const renderRating = () => (
    <HStack spacing={1}>
      {[1, 2, 3, 4, 5].map(value => (
        <IconButton
          key={value}
          size="sm"
          variant="ghost"
          aria-label={`Rate ${value}`}
          icon={<Icon as={state.rating && state.rating >= value ? Star : StarOff} color={state.rating && state.rating >= value ? 'yellow.400' : 'gray.400'} />}
          onClick={() => setState(prev => ({ ...prev, rating: prev.rating === value ? null : value }))}
        />
      ))}
      <Text fontSize="sm" color="gray.500">
        {state.rating ? `${state.rating}/5` : 'Tap to rate'}
      </Text>
    </HStack>
  );

  return (
    <HarnessErrorBoundary>
      <Box bg={sectionBg} p={6} borderRadius="xl" shadow="lg">
        <Stack spacing={6}>
          <HStack justify="space-between" align="center">
            <Heading size="lg">AI Play Generator Smoke Test</Heading>
            <HStack spacing={6}>
              <Tooltip label="Toggle console debug logging">
                <HStack>
                  <Text fontSize="sm">Debug Logs</Text>
                  <Switch isChecked={debug} onChange={event => setDebug(event.target.checked)} />
                </HStack>
              </Tooltip>
              <Tooltip label="Simulate offline fallback">
                <HStack>
                  <Text fontSize="sm">Force Offline</Text>
                  <Switch isChecked={forceOffline} onChange={event => setForceOffline(event.target.checked)} />
                </HStack>
              </Tooltip>
              <Button
                leftIcon={<RefreshCw size={16} />}
                colorScheme="blue"
                onClick={handleGenerate}
                isLoading={state.isGenerating}
                loadingText="Generating..."
                disabled={!scenario}
              >
                Generate Play
              </Button>
            </HStack>
          </HStack>

          <Card bg={cardBg} shadow="md">
            <CardHeader>
              <HStack justify="space-between" align="center">
                <Heading size="md">Scenario Selection</Heading>
                <Tag colorScheme="purple">
                  <TagLabel>{PLAY_SCENARIOS.length} scenarios</TagLabel>
                </Tag>
              </HStack>
            </CardHeader>
            <CardBody>
              <Stack spacing={4}>
                <Select value={state.scenarioId} onChange={handleScenarioChange}>
                  {PLAY_SCENARIOS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                {scenario && (
                  <Stack spacing={2} fontSize="sm" color="gray.600">
                    <Text>{scenario.description}</Text>
                    <Divider />
                    <Text fontWeight="semibold">Game Situation</Text>
                    <Text>
                      Score: {scenario.situation.ourScore}-{scenario.situation.theirScore} ({scenario.situation.scoreDifferential >= 0 ? '+' : ''}
                      {scenario.situation.scoreDifferential})
                    </Text>
                    <Text>Time Remaining: {scenario.situation.timeRemainingSeconds} seconds</Text>
                    <Text>Defensive Scheme: {scenario.situation.defenseScheme}</Text>
                    <Text>Court Position: {scenario.situation.courtPosition}</Text>
                    {scenario.playerContext && (
                      <Text>Player Context: {Object.entries(scenario.playerContext)
                        .filter(([, value]) => Boolean(value))
                        .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1')}: ${value}`)
                        .join(' · ')}</Text>
                    )}
                  </Stack>
                )}
              </Stack>
            </CardBody>
          </Card>

          {state.isGenerating && (
            <Flex align="center" justify="center" py={12}>
              <Spinner size="lg" thickness="4px" color="blue.400" />
            </Flex>
          )}

          {state.error && (
            <Card bg="red.50" borderColor="red.200" borderWidth="1px">
              <CardBody>
                <HStack spacing={3} color="red.600">
                  <Icon as={AlertTriangle} />
                  <Text>{state.error}</Text>
                </HStack>
              </CardBody>
            </Card>
          )}

          {state.play && scenario && (
            <Stack spacing={6}>
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <HStack justify="space-between" align="center">
                    <Heading size="md">Validation</Heading>
                    <Tag colorScheme={state.validation?.passed ? 'green' : 'red'}>
                      <TagLabel>{state.validation?.passed ? 'PASS' : 'CHECK'}</TagLabel>
                    </Tag>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <Stack spacing={3}>
                    {state.validation?.results.map(result => (
                      <HStack key={result.check} align="flex-start" spacing={3}>
                        <Icon as={result.passed ? CheckCircle : AlertTriangle} color={result.passed ? 'green.400' : 'red.400'} mt={0.5} />
                        <Box>
                          <Text fontWeight="semibold">{result.check}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {result.message}
                          </Text>
                        </Box>
                      </HStack>
                    ))}
                  </Stack>
                </CardBody>
              </Card>

              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <HStack justify="space-between" align="center">
                    <Heading size="md">Generated Play</Heading>
                    <HStack spacing={4}>
                      {state.isFallback && (
                        <Tag colorScheme="orange">
                          <TagLabel>Fallback Mode</TagLabel>
                        </Tag>
                      )}
                      {renderRating()}
                    </HStack>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <Box>
                      <Heading size="sm">{state.play.name}</Heading>
                      <Text fontSize="sm" color="gray.600">
                        Formation: {state.play.formation ?? 'N/A'} · Confidence: {Math.round((state.play.confidence ?? 0.6) * 100)}%
                      </Text>
                    </Box>
                    <Text>{state.play.description}</Text>
                    <Divider />
                    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                      <GridItem>
                        <Heading size="sm" mb={2}>
                          Player Responsibilities
                        </Heading>
                        <Stack spacing={2}>
                          {(state.play.positions ?? []).map(position => (
                            <Box key={position.position} bg={drillBg} p={3} borderRadius="md">
                              <Text fontWeight="semibold">{position.position}</Text>
                              <Text fontSize="sm" color="gray.600">
                                {position.movement}
                              </Text>
                              <Text fontSize="sm">{position.responsibility}</Text>
                            </Box>
                          ))}
                        </Stack>
                      </GridItem>
                      <GridItem>
                        <Heading size="sm" mb={2}>
                          Coaching Points
                        </Heading>
                        <Stack spacing={2}>
                          {(state.play.coachingPoints ?? []).map((point, index) => (
                            <Box key={`${state.play?.id}-point-${index}`} bg={drillBg} p={3} borderRadius="md">
                              <Text fontSize="sm">{point}</Text>
                            </Box>
                          ))}
                        </Stack>
                      </GridItem>
                    </Grid>
                    <Divider />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Heading size="sm" mb={2}>
                          Alternative Options
                        </Heading>
                        <Stack spacing={2}>
                          {(state.play.variations ?? ['Reset to high pick-and-roll if initial action is covered.', 'Call timeout if trap creates turnover risk.']).map((variation, index) => (
                            <Text key={`${state.play?.id}-variation-${index}`} fontSize="sm">
                              • {variation}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                      <Box>
                        <Heading size="sm" mb={2}>
                          Key Success Factors
                        </Heading>
                        <Stack spacing={1}>
                          {(state.play.keySuccessFactors ?? ['Spacing', 'Timing', 'Shot selection']).map((factor, index) => (
                            <Text key={`${state.play?.id}-factor-${index}`} fontSize="sm">
                              • {factor}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Input vs Output</Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
                    <Box>
                      <Heading size="sm" mb={2}>
                        Scenario Context
                      </Heading>
                      <Box as="pre" fontSize="xs" bg={jsonBg} p={3} borderRadius="md" maxH="260px" overflowY="auto">
                        {JSON.stringify(scenario, null, 2)}
                      </Box>
                    </Box>
                    <Box>
                      <Heading size="sm" mb={2}>
                        Play Output
                      </Heading>
                      <Box as="pre" fontSize="xs" bg={jsonBg} p={3} borderRadius="md" maxH="260px" overflowY="auto">
                        {JSON.stringify(state.play, null, 2)}
                      </Box>
                    </Box>
                    <Box>
                      <Heading size="sm" mb={2}>
                        Validation Summary
                      </Heading>
                      <Box as="pre" fontSize="xs" bg={jsonBg} p={3} borderRadius="md" maxH="260px" overflowY="auto">
                        {JSON.stringify(state.validation, null, 2)}
                      </Box>
                    </Box>
                  </SimpleGrid>
                </CardBody>
              </Card>
            </Stack>
          )}
        </Stack>
      </Box>
    </HarnessErrorBoundary>
  );
};

export default PlayGeneratorTestHarness;
