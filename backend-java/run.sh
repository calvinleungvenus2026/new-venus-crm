#!/bin/bash
set -e

if [ -f ".env.local" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
    esac
    export "$line"
  done < .env.local
fi

if command -v mvn >/dev/null 2>&1; then
  MVN_CMD="mvn"
elif [ -x "/opt/homebrew/bin/mvn" ]; then
  MVN_CMD="/opt/homebrew/bin/mvn"
elif [ -x "/usr/local/bin/mvn" ]; then
  MVN_CMD="/usr/local/bin/mvn"
else
  echo "Maven is not installed."
  echo "Install it with: brew install maven"
  exit 1
fi

"$MVN_CMD" -q -DskipTests package
java -jar target/backend-java-0.1.0.jar
