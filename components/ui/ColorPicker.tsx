import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WheelColorPicker from 'react-native-wheel-color-picker';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  label: string;
  textColor: string;
}

export function ColorPicker({ color, onColorChange, label, textColor }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.pickerContainer}>
        <WheelColorPicker
          color={color}
          onColorChange={onColorChange}
          thumbSize={30}
          sliderSize={20}
          noSnap={true}
          row={false}
        />
      </View>
      <View style={styles.currentColor}>
        <Text style={[styles.colorText, { color: textColor }]}>Current: {color}</Text>
        <View style={[styles.colorPreview, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  pickerContainer: {
    height: 300,
    marginBottom: 16,
  },
  currentColor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorText: {
    fontSize: 14,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#444',
  },
});
