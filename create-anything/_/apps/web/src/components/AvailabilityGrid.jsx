import React from "react";
import { Box, Grid, GridItem, Text, Button, VStack, Heading } from "@chakra-ui/react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBREV_MAP = {
  "Mon": "Monday",
  "Tue": "Tuesday",
  "Wed": "Wednesday",
  "Thu": "Thursday",
  "Fri": "Friday",
  "Sat": "Saturday",
  "Sun": "Sunday"
};

const TIME_SLOTS = [
  { label: "Morning", value: "morning", time: "9am-12pm", start: "09:00", end: "12:00" },
  { label: "Afternoon", value: "afternoon", time: "12pm-5pm", start: "12:00", end: "17:00" },
  { label: "Evening", value: "evening", time: "5pm-9pm", start: "17:00", end: "21:00" },
];

export default function AvailabilityGrid({ value = {}, onChange }) {
  const toggleSlot = (day, slot) => {
    const key = `${day}-${slot}`;
    const newValue = { ...value };
    
    if (newValue[key]) {
      delete newValue[key];
    } else {
      newValue[key] = true;
    }
    
    onChange(newValue);
  };

  const isSelected = (day, slot) => {
    const key = `${day}-${slot}`;
    return !!value[key];
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Box overflowX="auto">
        <Grid
          templateColumns={`140px repeat(${TIME_SLOTS.length}, 1fr)`}
          gap={2}
          minW="600px"
        >
          <GridItem />
          {TIME_SLOTS.map((slot) => (
            <GridItem key={slot.value} textAlign="center">
              <VStack spacing={0}>
                <Text fontWeight="bold" fontSize="sm" color="gray.800">
                  {slot.label}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {slot.time}
                </Text>
              </VStack>
            </GridItem>
          ))}

          {DAYS.map((day) => (
            <React.Fragment key={day}>
              <GridItem display="flex" alignItems="center">
                <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                  {day}
                </Text>
              </GridItem>
              {TIME_SLOTS.map((slot) => (
                <GridItem key={`${day}-${slot.value}`}>
                  <Button
                    onClick={() => toggleSlot(day, slot.value)}
                    size="md"
                    w="full"
                    h="12"
                    colorScheme={isSelected(day, slot.value) ? "purple" : "gray"}
                    variant={isSelected(day, slot.value) ? "solid" : "outline"}
                    bg={isSelected(day, slot.value) ? "purple.500" : "white"}
                    _hover={{
                      bg: isSelected(day, slot.value) ? "purple.600" : "purple.50",
                    }}
                  >
                    {isSelected(day, slot.value) ? "✓" : ""}
                  </Button>
                </GridItem>
              ))}
            </React.Fragment>
          ))}
        </Grid>
      </Box>
      <Text fontSize="sm" color="gray.600">
        Select the times when you're typically available for video chats. This helps others schedule meetings with you.
      </Text>
    </VStack>
  );
}

export function availabilityGridToTypical(gridValue) {
  const slots = [];
  
  for (const key in gridValue) {
    if (gridValue[key]) {
      const [day, slotValue] = key.split('-');
      const timeSlot = TIME_SLOTS.find(s => s.value === slotValue);
      if (timeSlot) {
        const existing = slots.find(
          s => s.start === timeSlot.start && s.end === timeSlot.end
        );
        if (existing) {
          if (!existing.days.includes(day)) {
            existing.days.push(day);
          }
        } else {
          slots.push({
            days: [day],
            start: timeSlot.start,
            end: timeSlot.end,
          });
        }
      }
    }
  }
  
  return slots;
}

export function typicalToAvailabilityGrid(typical) {
  const gridValue = {};
  
  if (!Array.isArray(typical)) return gridValue;
  
  typical.forEach(slot => {
    const timeSlot = TIME_SLOTS.find(
      ts => ts.start === slot.start && ts.end === slot.end
    );
    if (timeSlot && Array.isArray(slot.days)) {
      slot.days.forEach(day => {
        const fullDay = DAY_ABBREV_MAP[day] || day;
        if (DAYS.includes(fullDay)) {
          const key = `${fullDay}-${timeSlot.value}`;
          gridValue[key] = true;
        }
      });
    }
  });
  
  return gridValue;
}
