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

# Output useful information
echo "Current working directory: $(pwd)"
echo "Script directory: ${SCRIPT_DIR}"
echo "Category path: ${CATEGORY_PATH}"

echo "Running test ${TEST_NUM} from ${CATEGORY_PATH}..."

# Run TypeScript test
echo "Running TypeScript test..."
npx tsx ${SCRIPT_DIR}/run_test_ts.ts $1 "${CATEGORY_PATH}"

if [ $? -ne 0 ]; then
  echo "TypeScript test failed"
  exit 1
fi

# Run Python test
echo "Running Python test..."
python3 ${SCRIPT_DIR}/run_test_py.py $1 "${CATEGORY_PATH}"

if [ $? -ne 0 ]; then
  echo "Python test failed"
  exit 1
fi

# If both scripts ran successfully, exit with success
echo "Test ${TEST_NUM} PASSED: Both TypeScript and Python scripts ran successfully"
exit 0