#!/bin/bash

# Script to run both TypeScript and Python tests (without comparing results)

# Check if test number is provided
if [ -z "$1" ]; then
  echo "Please provide a test number as an argument"
  exit 1
fi

# Check if category path is provided
if [ -z "$2" ]; then
  echo "Please provide a category path as a second argument"
  exit 1
fi

TEST_NUM=$(printf "%03d" $1)
CATEGORY_PATH="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Output the current working directory
echo "Current working directory: $(pwd)"
echo "Script directory: ${SCRIPT_DIR}"
echo "Category path: ${CATEGORY_PATH}"

echo "Running test ${TEST_NUM} from ${CATEGORY_PATH}..."

# Copy the test files from the category path to the script directory
cp "${CATEGORY_PATH}/${TEST_NUM}-original.txt" "${SCRIPT_DIR}/${TEST_NUM}-original.txt"
cp "${CATEGORY_PATH}/${TEST_NUM}-diff.txt" "${SCRIPT_DIR}/${TEST_NUM}-diff.txt"

# Run TypeScript test
echo "Running TypeScript test..."
npx tsx ${SCRIPT_DIR}/run_test_ts.ts $1 "${CATEGORY_PATH}"

if [ $? -ne 0 ]; then
  echo "TypeScript test failed"
  # Clean up
  rm -f "${SCRIPT_DIR}/${TEST_NUM}-original.txt"
  rm -f "${SCRIPT_DIR}/${TEST_NUM}-diff.txt"
  exit 1
fi

# Run Python test
echo "Running Python test..."
python ${SCRIPT_DIR}/run_test_py.py $1 "${CATEGORY_PATH}"

if [ $? -ne 0 ]; then
  echo "Python test failed"
  # Clean up
  rm -f "${SCRIPT_DIR}/${TEST_NUM}-original.txt"
  rm -f "${SCRIPT_DIR}/${TEST_NUM}-diff.txt"
  exit 1
fi

# Clean up
rm -f "${SCRIPT_DIR}/${TEST_NUM}-original.txt"
rm -f "${SCRIPT_DIR}/${TEST_NUM}-diff.txt"

# If both scripts ran successfully, exit with success
echo "Test ${TEST_NUM} PASSED: Both TypeScript and Python scripts ran successfully"
exit 0