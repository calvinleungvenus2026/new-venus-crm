#!/bin/bash
set -e

if [ -f ".env.local" ] && [ -z "${INVOCATION_ID:-}" ]; then
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
  echo "Install Maven and ensure 'mvn' is on PATH."
  exit 1
fi

"$MVN_CMD" -q -DskipTests -Dmaven.compiler.release=21 -Dmaven.compiler.source=21 -Dmaven.compiler.target=21 compile dependency:build-classpath -Dmdep.outputFile=target/classpath.txt
java -cp "target/classes:$(cat target/classpath.txt)" com.venuscrm.api.CrmServer
