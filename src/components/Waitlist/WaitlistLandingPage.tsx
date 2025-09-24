import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Container,
  SimpleGrid,
  Icon,
  Badge,
  Divider,
  useColorModeValue,
  Fade,
  ScaleFade,
  useBreakpointValue,
  Image,
  Link,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  Mail,
  Users,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  Brain,
  Target,
  Trophy,
  Shield,
  Zap,
  Heart,
  Award,
  Crown,
  Calendar,
  BarChart3,
  MessageSquare,
  Share2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
} from 'lucide-react';
import EnhancedWaitlistForm from './EnhancedWaitlistForm';
import { trackUserAction } from '../../services/monitoring';

interface WaitlistLandingPageProps {
  variant?: 'beta' | 'launch' | 'pre-launch';
  showStats?: boolean;
  showTestimonials?: boolean;
  showFeatures?: boolean;
  showPricing?: boolean;
  showSocialProof?: boolean;
  enableMarketingFields?: boolean;
  enableLeadScoring?: boolean;
  enableReferrals?: boolean;
}

const WaitlistLandingPage: React.FC<WaitlistLandingPageProps> = ({
  variant = 'pre-launch',
  showStats = true,
  showTestimonials = true,
  showFeatures = true,
  showPricing = false,
  showSocialProof = true,
  enableMarketingFields = true,
  enableLeadScoring = true,
  enableReferrals = true,
}) => {
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.900');
  const cardBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');
  
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    setIsVisible(true);
    // Simulate waitlist count (in real app, this would come from API)
    setWaitlistCount(1247);
    
    // Track page view
    trackUserAction('waitlist_landing_view', {
      variant,
      enableMarketingFields,
      enableLeadScoring,
      enableReferrals,
      timestamp: new Date().toISOString(),
    });
  }, [variant, enableMarketingFields, enableLeadScoring, enableReferrals]);

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Play Design',
      description: 'Generate intelligent plays based on game situations, opponent analysis, and your team\'s strengths.',
      color: 'purple',
    },
    {
      icon: Calendar,
      title: 'Smart Practice Planning',
      description: 'Create optimized practice schedules with AI-suggested drills and progress tracking.',
      color: 'blue',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Comprehensive roster management, performance tracking, and player development insights.',
      color: 'green',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep insights into team performance, player statistics, and game analysis.',
      color: 'orange',
    },
    {
      icon: Target,
      title: 'Game Strategy',
      description: 'Strategic game planning with opponent scouting and situational play calling.',
      color: 'red',
    },
    {
      icon: Trophy,
      title: 'Performance Tracking',
      description: 'Monitor player development and team progress with detailed metrics and reports.',
      color: 'yellow',
    },
  ];

  const testimonials = [
    {
      name: 'Coach Mike Johnson',
      role: 'Head Coach, Lincoln High School',
      content: 'Coach Core AI has revolutionized how we plan practices and design plays. The AI suggestions are incredibly accurate.',
      rating: 5,
    },
    {
      name: 'Sarah Williams',
      role: 'Assistant Coach, State University',
      content: 'The team management features are outstanding. We can track every player\'s progress and make data-driven decisions.',
      rating: 5,
    },
    {
      name: 'Coach David Chen',
      role: 'Youth League Coordinator',
      content: 'This platform has made coaching so much more efficient. Our players are improving faster than ever.',
      rating: 5,
    },
  ];

  const pricingTiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '3 saved plays',
        'Basic practice planner',
        'Team roster (up to 25 players)',
        'Email support',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For serious coaches',
      features: [
        'Unlimited plays',
        'AI play suggestions',
        'Advanced analytics',
        'Unlimited team size',
        'Priority support',
        'Export capabilities',
      ],
      cta: 'Start Pro Trial',
      popular: true,
    },
    {
      name: 'Team',
      price: '$99',
      period: 'per month',
      description: 'For coaching staffs',
      features: [
        'Everything in Pro',
        'Multi-coach access',
        'Advanced reporting',
        'Custom integrations',
        'Dedicated support',
        'White-label options',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const socialProof = [
    { label: 'Coaches on Waitlist', value: '1,247', icon: Users },
    { label: 'Schools Using Beta', value: '89', icon: Globe },
    { label: 'Plays Generated', value: '15,432', icon: Play },
    { label: 'Happy Coaches', value: '98%', icon: Heart },
  ];

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Hero Section */}
      <Container maxW="7xl" py={20}>
        <Fade in={isVisible} delay={0.1}>
          <VStack spacing={8} textAlign="center">
            {/* Badge */}
            <Badge
              colorScheme="blue"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="semibold"
            >
              <HStack spacing={2}>
                <Icon as={Sparkles} boxSize={4} />
                <Text>
                  {variant === 'beta' ? 'Beta Access Available' : 
                   variant === 'launch' ? 'Now Live!' : 
                   'Coming Soon'}
                </Text>
              </HStack>
            </Badge>

            {/* Main Heading */}
            <VStack spacing={4}>
              <Heading
                as="h1"
                size={{ base: '2xl', md: '4xl' }}
                color={headingColor}
                fontWeight="bold"
                lineHeight="shorter"
              >
                The Future of{' '}
                <Text as="span" color="blue.500">
                  Football Coaching
                </Text>{' '}
                is Here
              </Heading>
              
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                color={textColor}
                maxW="3xl"
                lineHeight="tall"
              >
                Join thousands of coaches using AI to design better plays, 
                plan smarter practices, and win more games.
              </Text>
            </VStack>

            {/* CTA Section */}
            <VStack spacing={6} w="full" maxW="md">
              <EnhancedWaitlistForm
                variant={variant}
                showFeatures={true}
                autoInvite={variant === 'beta'}
                showMarketingFields={enableMarketingFields}
                showReferralField={enableReferrals}
                enableLeadScoring={enableLeadScoring}
                onSuccess={(entry) => {
                  trackUserAction('waitlist_signup_success', {
                    variant,
                    role: entry.role,
                    teamLevel: entry.teamLevel,
                    leadScore: entry.leadScore,
                    segment: entry.segment,
                  });
                }}
              />
              
              <Text fontSize="sm" color={textColor}>
                Join {waitlistCount.toLocaleString()}+ coaches already on the waitlist
              </Text>
            </VStack>

            {/* Social Proof Stats */}
            {showSocialProof && (
              <ScaleFade in={isVisible} delay={0.3}>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8} w="full" maxW="4xl">
                  {socialProof.map((proof, index) => (
                    <VStack key={index} spacing={2}>
                      <Icon as={proof.icon} boxSize={8} color="blue.500" />
                      <Stat textAlign="center">
                        <StatNumber fontSize="2xl" fontWeight="bold">
                          {proof.value}
                        </StatNumber>
                        <StatLabel fontSize="sm" color={textColor}>
                          {proof.label}
                        </StatLabel>
                      </Stat>
                    </VStack>
                  ))}
                </SimpleGrid>
              </ScaleFade>
            )}
          </VStack>
        </Fade>
      </Container>

      {/* Features Section */}
      {showFeatures && (
        <Box bg={cardBg} py={20}>
          <Container maxW="7xl">
            <Fade in={isVisible} delay={0.4}>
              <VStack spacing={16}>
                <VStack spacing={4} textAlign="center">
                  <Heading size="xl" color={headingColor}>
                    Everything You Need to Coach Better
                  </Heading>
                  <Text fontSize="lg" color={textColor} maxW="2xl">
                    Powerful AI-driven tools designed specifically for football coaches
                  </Text>
                </VStack>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} w="full">
                  {features.map((feature, index) => (
                    <ScaleFade key={index} in={isVisible} delay={0.5 + index * 0.1}>
                      <Box
                        p={6}
                        bg={bgColor}
                        borderRadius="xl"
                        border="1px"
                        borderColor={borderColor}
                        _hover={{
                          transform: 'translateY(-4px)',
                          boxShadow: 'xl',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <VStack spacing={4} align="start">
                          <Icon
                            as={feature.icon}
                            boxSize={10}
                            color={`${feature.color}.500`}
                          />
                          <VStack spacing={2} align="start">
                            <Heading size="md" color={headingColor}>
                              {feature.title}
                            </Heading>
                            <Text color={textColor} fontSize="sm">
                              {feature.description}
                            </Text>
                          </VStack>
                        </VStack>
                      </Box>
                    </ScaleFade>
                  ))}
                </SimpleGrid>
              </VStack>
            </Fade>
          </Container>
        </Box>
      )}

      {/* Testimonials Section */}
      {showTestimonials && (
        <Container maxW="7xl" py={20}>
          <Fade in={isVisible} delay={0.6}>
            <VStack spacing={16}>
              <VStack spacing={4} textAlign="center">
                <Heading size="xl" color={headingColor}>
                  Trusted by Coaches Everywhere
                </Heading>
                <Text fontSize="lg" color={textColor}>
                  See what coaches are saying about Coach Core AI
                </Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
                {testimonials.map((testimonial, index) => (
                  <ScaleFade key={index} in={isVisible} delay={0.7 + index * 0.1}>
                    <Box
                      p={6}
                      bg={cardBg}
                      borderRadius="xl"
                      border="1px"
                      borderColor={borderColor}
                    >
                      <VStack spacing={4} align="start">
                        <HStack spacing={1}>
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Icon key={i} as={Star} boxSize={4} color="yellow.400" />
                          ))}
                        </HStack>
                        <Text color={textColor} fontStyle="italic">
                          "{testimonial.content}"
                        </Text>
                        <VStack spacing={1} align="start">
                          <Text fontWeight="semibold" color={headingColor}>
                            {testimonial.name}
                          </Text>
                          <Text fontSize="sm" color={textColor}>
                            {testimonial.role}
                          </Text>
                        </VStack>
                      </VStack>
                    </Box>
                  </ScaleFade>
                ))}
              </SimpleGrid>
            </VStack>
          </Fade>
        </Container>
      )}

      {/* Pricing Section */}
      {showPricing && (
        <Box bg={cardBg} py={20}>
          <Container maxW="7xl">
            <Fade in={isVisible} delay={0.8}>
              <VStack spacing={16}>
                <VStack spacing={4} textAlign="center">
                  <Heading size="xl" color={headingColor}>
                    Simple, Transparent Pricing
                  </Heading>
                  <Text fontSize="lg" color={textColor}>
                    Choose the plan that fits your coaching needs
                  </Text>
                </VStack>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
                  {pricingTiers.map((tier, index) => (
                    <ScaleFade key={index} in={isVisible} delay={0.9 + index * 0.1}>
                      <Box
                        p={8}
                        bg={bgColor}
                        borderRadius="xl"
                        border="2px"
                        borderColor={tier.popular ? 'blue.500' : borderColor}
                        position="relative"
                        _hover={{
                          transform: 'translateY(-4px)',
                          boxShadow: 'xl',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {tier.popular && (
                          <Badge
                            position="absolute"
                            top={-3}
                            left="50%"
                            transform="translateX(-50%)"
                            colorScheme="blue"
                            px={4}
                            py={1}
                            borderRadius="full"
                          >
                            Most Popular
                          </Badge>
                        )}
                        
                        <VStack spacing={6} align="start">
                          <VStack spacing={2} align="start">
                            <Heading size="lg" color={headingColor}>
                              {tier.name}
                            </Heading>
                            <HStack>
                              <Text fontSize="3xl" fontWeight="bold" color={headingColor}>
                                {tier.price}
                              </Text>
                              <Text color={textColor}>/{tier.period}</Text>
                            </HStack>
                            <Text color={textColor}>{tier.description}</Text>
                          </VStack>

                          <VStack spacing={3} align="start" w="full">
                            {tier.features.map((feature, featureIndex) => (
                              <HStack key={featureIndex} spacing={3}>
                                <Icon as={CheckCircle} boxSize={4} color="green.500" />
                                <Text fontSize="sm" color={textColor}>
                                  {feature}
                                </Text>
                              </HStack>
                            ))}
                          </VStack>

                          <Button
                            colorScheme={tier.popular ? 'blue' : 'gray'}
                            size="lg"
                            w="full"
                            rightIcon={<ArrowRight />}
                          >
                            {tier.cta}
                          </Button>
                        </VStack>
                      </Box>
                    </ScaleFade>
                  ))}
                </SimpleGrid>
              </VStack>
            </Fade>
          </Container>
        </Box>
      )}

      {/* Final CTA Section */}
      <Container maxW="7xl" py={20}>
        <Fade in={isVisible} delay={1.0}>
          <Box
            p={12}
            bg="blue.50"
            borderRadius="2xl"
            textAlign="center"
            border="1px"
            borderColor="blue.200"
          >
            <VStack spacing={6}>
              <Heading size="xl" color="blue.900">
                Ready to Transform Your Coaching?
              </Heading>
              <Text fontSize="lg" color="blue.700" maxW="2xl">
                Join thousands of coaches who are already using AI to win more games 
                and develop better players.
              </Text>
              <HStack spacing={4} flexWrap="wrap" justify="center">
                <Button
                  colorScheme="blue"
                  size="lg"
                  rightIcon={<ArrowRight />}
                  onClick={() => {
                    document.getElementById('waitlist-form')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }}
                >
                  Join the Waitlist
                </Button>
                <Button
                  variant="outline"
                  colorScheme="blue"
                  size="lg"
                  rightIcon={<ExternalLink />}
                >
                  Watch Demo
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Fade>
      </Container>

      {/* Footer */}
      <Box bg={cardBg} py={12}>
        <Container maxW="7xl">
          <VStack spacing={8}>
            <HStack spacing={8} flexWrap="wrap" justify="center">
              <Link href="#" fontSize="sm" color={textColor}>
                Privacy Policy
              </Link>
              <Link href="#" fontSize="sm" color={textColor}>
                Terms of Service
              </Link>
              <Link href="#" fontSize="sm" color={textColor}>
                Contact Us
              </Link>
              <Link href="#" fontSize="sm" color={textColor}>
                Support
              </Link>
            </HStack>
            <Text fontSize="sm" color={textColor} textAlign="center">
              © 2024 Coach Core AI. All rights reserved.
            </Text>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default WaitlistLandingPage;