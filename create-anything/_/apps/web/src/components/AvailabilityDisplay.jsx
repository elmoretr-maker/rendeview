import React from "react";
import { Box, Grid, GridItem, Text, VStack, Badge } from "@chakra-ui/react";

const DAYS_SHORT = {
  "Monday": "Mon",
  "Tuesday": "Tue",
  "Wednesday": "Wed",
  "Thursday": "Thu",
  "Friday": "Fri",
  "Saturday": "Sat",
  "Sunday": "Sun"
};

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

export default function AvailabilityDisplay({ typical }) {
  if (!Array.isArray(typical) || typical.length === 0) {
    return null;
  }

  const gridData = {};
  const allDays = Object.keys(DAYS_SHORT);

  typical.forEach(slot => {
    const timeSlot = TIME_SLOTS.find(
      ts => ts.start === slot.start && ts.end === slot.end
    );
    if (timeSlot && Array.isArray(slot.days)) {
      slot.days.forEach(day => {
        const fullDay = DAY_ABBREV_MAP[day] || day;
        if (!gridData[fullDay]) {
          gridData[fullDay] = [];
        }
        gridData[fullDay].push(timeSlot.value);
      });
    }
  });

  const hasAnyAvailability = Object.keys(gridData).length > 0;

  if (!hasAnyAvailability) {
    return null;
  }

  return (
    <Box>
      <Grid
        templateColumns={`100px repeat(${TIME_SLOTS.length}, 1fr)`}
        gap={2}
        fontSize="sm"
      >
        <GridItem />
        {TIME_SLOTS.map((slot) => (
          <GridItem key={slot.value} textAlign="center">
            <VStack spacing={0}>
              <Text fontWeight="semibold" fontSize="xs" color="gray.700">
                {slot.label}
              </Text>
              <Text fontSize="2xs" color="gray.500">
                {slot.time}
              </Text>
            </VStack>
          </GridItem>
        ))}

        {allDays.map((day) => {
          const daySlots = gridData[day] || [];
          if (daySlots.length === 0) return null;
          
          return (
            <React.Fragment key={day}>
              <GridItem display="flex" alignItems="center">
                <Text fontWeight="medium" fontSize="xs" color="gray.700">
                  {DAYS_SHORT[day]}
                </Text>
              </GridItem>
              {TIME_SLOTS.map((slot) => {
                const isAvailable = daySlots.includes(slot.value);
                return (
                  <GridItem key={`${day}-${slot.value}`} display="flex" alignItems="center" justifyContent="center">
                    {isAvailable ? (
                      <Box
                        w="8"
                        h="8"
                        borderRadius="md"
                        bg="teal.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text color="white" fontWeight="bold" fontSize="xs">✓</Text>
                      </Box>
                    ) : (
                      <Box w="8" h="8" />
                    )}
                  </GridItem>
                );
              })}
            </React.Fragment>
          );
        })}
      </Grid>
    </Box>
  );
}
