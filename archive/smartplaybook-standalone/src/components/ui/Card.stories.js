import Card from './Card';
import { Text, Heading } from '@chakra-ui/react';

export default {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    shadow: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'none'],
    },
    borderRadius: {
      control: { type: 'select' },
      options: ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', 'full'],
    },
  },
};

export const Default = {
  args: {
    children: (
      <>
        <Heading size="md" mb={4}>Card Title</Heading>
        <Text>This is a basic card with some content. It can contain any React components.</Text>
      </>
    ),
  },
};

export const WithShadow = {
  args: {
    shadow: 'lg',
    children: (
      <>
        <Heading size="md" mb={4}>Card with Large Shadow</Heading>
        <Text>This card has a larger shadow for more emphasis.</Text>
      </>
    ),
  },
};

export const Rounded = {
  args: {
    borderRadius: 'xl',
    children: (
      <>
        <Heading size="md" mb={4}>Rounded Card</Heading>
        <Text>This card has extra rounded corners for a softer look.</Text>
      </>
    ),
  },
};

export const Compact = {
  args: {
    padding: 4,
    children: (
      <>
        <Heading size="sm" mb={2}>Compact Card</Heading>
        <Text fontSize="sm">This card has reduced padding for a more compact appearance.</Text>
      </>
    ),
  },
};

export const WithBorder = {
  args: {
    border: '1px solid',
    borderColor: 'gray.200',
    shadow: 'none',
    children: (
      <>
        <Heading size="md" mb={4}>Card with Border</Heading>
        <Text>This card uses a border instead of a shadow for a different visual style.</Text>
      </>
    ),
  },
}; 