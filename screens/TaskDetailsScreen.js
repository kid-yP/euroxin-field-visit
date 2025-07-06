import React, { useState, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebase/config';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';

export default function TaskDetailsScreen({ route, navigation }) {
  const { task, mode } = route.params || {};
  const isCreate = mode === 'create';

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.dueDate?.toDate?.() || new Date());
  const [status, setStatus] = useState(task?.status || 'pending');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const titleInputRef = useRef(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isCreate ? 'Add Task' : 'Task Details',
      headerRight: () =>
        !isCreate ? null : (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <Text style={{ color: 'red', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        ),
    });
  }, [navigation, isCreate]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    const now = new Date();
    if (dueDate < now.setHours(0, 0, 0, 0)) {
      Alert.alert('Validation', 'Due date cannot be in the past.');
      return;
    }

    try {
      if (isCreate) {
        await addDoc(collection(db, 'tasks'), {
          title,
          description,
          dueDate,
          status,
        });
      } else {
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
          title,
          description,
          dueDate,
          status,
        });
      }

      navigation.goBack();
    } catch (err) {
      console.error('Error saving task:', err);
      Alert.alert('Error', 'Could not save task. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'tasks', task.id));
              Alert.alert('Deleted', 'Task has been deleted.');
              navigation.navigate('Tasks'); // adjust if your tasks screen route name differs
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task.');
              console.error(error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const updatedDate = new Date(dueDate);
      updatedDate.setFullYear(selectedDate.getFullYear());
      updatedDate.setMonth(selectedDate.getMonth());
      updatedDate.setDate(selectedDate.getDate());
      setDueDate(updatedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const updatedDate = new Date(dueDate);
      updatedDate.setHours(selectedTime.getHours());
      updatedDate.setMinutes(selectedTime.getMinutes());
      setDueDate(updatedDate);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput
          ref={titleInputRef}
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter title"
          autoFocus
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          multiline
        />

        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
          <Text>{dueDate?.toDateString?.() || 'Pick a date'}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        <Text style={styles.label}>Time</Text>
        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.dateButton}>
          <Text>
            {dueDate
              ? dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Pick a time'}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        <Text style={styles.label}>Status</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={status}
            onValueChange={(itemValue) => setStatus(itemValue)}
          >
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="Completed" value="completed" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{isCreate ? 'Create Task' : 'Save Changes'}</Text>
        </TouchableOpacity>

        {/* Delete Button only in edit mode */}
        {!isCreate && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
