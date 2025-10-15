import React, { useState, KeyboardEvent } from 'react';
import {
  Box,
  Input,
  Tag,
  TagLabel,
  TagCloseButton,
  VStack,
  HStack,
} from '@chakra-ui/react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Add tags...',
  maxTags = 10,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !value.includes(tag) && value.length < maxTags) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue.trim());
    }
  };

  return (
    <VStack align="stretch" spacing={2}>
      <Box
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={2}
        minH="40px"
        bg="white"
        _focusWithin={{
          borderColor: 'blue.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
        }}
      >
        <HStack spacing={2} flexWrap="wrap" align="flex-start">
          {value.map((tag, index) => (
            <Tag
              key={index}
              size="md"
              colorScheme="blue"
              borderRadius="full"
              variant="solid"
            >
              <TagLabel>{tag}</TagLabel>
              <TagCloseButton onClick={() => removeTag(index)} />
            </Tag>
          ))}
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleBlur}
            placeholder={value.length >= maxTags ? 'Max tags reached' : placeholder}
            aria-label="Add tag"
            variant="unstyled"
            size="sm"
            minW="120px"
            isDisabled={value.length >= maxTags}
          />
        </HStack>
      </Box>
      {value.length >= maxTags && (
        <Box fontSize="sm" color="gray.500">
          Maximum {maxTags} tags allowed
        </Box>
      )}
    </VStack>
  );
};

export default TagInput;
