#!/bin/bash
set -e
mkdir -p out
javac -d out src/main/java/com/venuscrm/api/CrmServer.java
java -cp out com.venuscrm.api.CrmServer
