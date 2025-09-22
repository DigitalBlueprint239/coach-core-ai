#!/bin/bash

# K6 Load Testing Runner Script
# Runs comprehensive load tests against staging environment

set -e

# Configuration
STAGING_URL="https://coach-core-ai-staging.web.app"
OUTPUT_DIR="load-test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="${OUTPUT_DIR}/${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}🚀 Starting K6 Load Testing Suite${NC}"
echo -e "${BLUE}Target: ${STAGING_URL}${NC}"
echo -e "${BLUE}Results: ${RESULTS_DIR}${NC}"
echo ""

# Function to run a test scenario
run_test() {
    local test_name="$1"
    local test_file="$2"
    local duration="$3"
    local users="$4"
    local description="$5"
    
    echo -e "${YELLOW}📊 Running Test: ${test_name}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    echo -e "${YELLOW}Duration: ${duration} | Users: ${users}${NC}"
    echo ""
    
    local output_file="${RESULTS_DIR}/${test_name}_${TIMESTAMP}.json"
    local summary_file="${RESULTS_DIR}/${test_name}_${TIMESTAMP}_summary.txt"
    
    # Run k6 test
    k6 run \
        --out json="${output_file}" \
        --summary-export="${summary_file}" \
        --env TARGET_URL="${STAGING_URL}" \
        --env TEST_DURATION="${duration}" \
        --env TEST_USERS="${users}" \
        "${test_file}"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Test completed successfully: ${test_name}${NC}"
    else
        echo -e "${RED}❌ Test failed: ${test_name} (exit code: ${exit_code})${NC}"
    fi
    
    echo ""
    return $exit_code
}

# Function to check staging environment
check_staging() {
    echo -e "${BLUE}🔍 Checking staging environment...${NC}"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Staging environment is accessible${NC}"
    else
        echo -e "${RED}❌ Staging environment not accessible (HTTP ${response})${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to generate comprehensive report
generate_report() {
    echo -e "${BLUE}📊 Generating comprehensive report...${NC}"
    
    # Find the most recent JSON output file
    local latest_json=$(find "$RESULTS_DIR" -name "*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [ -n "$latest_json" ]; then
        node generate-report.js "$latest_json"
        echo -e "${GREEN}✅ Report generated successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  No JSON output files found for report generation${NC}"
    fi
    
    echo ""
}

# Function to display test summary
display_summary() {
    echo -e "${BLUE}📋 Test Summary${NC}"
    echo "=================="
    echo "Target URL: ${STAGING_URL}"
    echo "Results Directory: ${RESULTS_DIR}"
    echo "Timestamp: ${TIMESTAMP}"
    echo ""
    
    # List all test results
    if [ -d "$RESULTS_DIR" ]; then
        echo "Test Results:"
        for file in "$RESULTS_DIR"/*.json; do
            if [ -f "$file" ]; then
                local basename=$(basename "$file" .json)
                echo "  - ${basename}"
            fi
        done
    fi
    
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🎯 K6 Load Testing Suite${NC}"
    echo "=========================="
    echo ""
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 is not installed. Please install k6 first.${NC}"
        echo "Installation: npm install -g k6"
        exit 1
    fi
    
    # Check staging environment
    check_staging
    
    # Run test scenarios
    local failed_tests=0
    
    # Test 1: 100 concurrent users
    run_test \
        "100_users" \
        "k6-scenarios.js" \
        "10m" \
        "100" \
        "100 concurrent users for 10 minutes"
    
    if [ $? -ne 0 ]; then
        ((failed_tests++))
    fi
    
    # Test 2: 500 concurrent users
    run_test \
        "500_users" \
        "k6-scenarios.js" \
        "10m" \
        "500" \
        "500 concurrent users for 10 minutes"
    
    if [ $? -ne 0 ]; then
        ((failed_tests++))
    fi
    
    # Test 3: 1000 concurrent users
    run_test \
        "1000_users" \
        "k6-scenarios.js" \
        "10m" \
        "1000" \
        "1000 concurrent users for 10 minutes"
    
    if [ $? -ne 0 ]; then
        ((failed_tests++))
    fi
    
    # Test 4: Bottleneck analysis
    run_test \
        "bottleneck_analysis" \
        "bottleneck-analysis.js" \
        "40m" \
        "1000" \
        "Bottleneck analysis with gradual load increase"
    
    if [ $? -ne 0 ]; then
        ((failed_tests++))
    fi
    
    # Test 5: Stress test
    run_test \
        "stress_test" \
        "k6-scenarios.js" \
        "20m" \
        "1200" \
        "Stress test to find breaking point"
    
    if [ $? -ne 0 ]; then
        ((failed_tests++))
    fi
    
    # Generate comprehensive report
    generate_report
    
    # Display summary
    display_summary
    
    # Final status
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
        echo -e "${GREEN}📊 Check the results in: ${RESULTS_DIR}${NC}"
    else
        echo -e "${YELLOW}⚠️  ${failed_tests} test(s) failed. Check the logs above.${NC}"
        echo -e "${YELLOW}📊 Partial results available in: ${RESULTS_DIR}${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Review the generated report for bottlenecks and recommendations"
    echo "2. Implement recommended optimizations"
    echo "3. Re-run tests to validate improvements"
    echo "4. Set up continuous load testing in CI/CD pipeline"
    echo ""
}

# Run main function
main "$@"