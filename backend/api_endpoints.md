# API Endpoints Summary

Based on `backend/a.md`, the following API endpoints are defined.

## 1. Record Management

### Create Record
*   **Endpoint**: `POST /records`
*   **Description**: Creates a new record (diary entry) and stores it. The server automatically assigns `createdAt` if not provided. Also triggers the emotion extraction pipeline.
*   **Input**:
    *   `content` (string, required): The main text of the record.
    *   `userId` (string, required): The user ID.
    *   `people` (array, optional): List of people mentioned.
    *   `places` (array, optional): List of places mentioned.
    *   `emotionTags` (array, optional): List of emotion tags.
    *   `source` (string, optional): Source of the record.
*   **Output**:
    *   `recordId` (string): The unique ID of the created record.

## 2. Search & Context

### Semantic Search
*   **Endpoint**: `POST /search`
*   **Description**: Performs a semantic search on records and generates a context graph (subgraph) based on the results. This session can be used for subsequent questions.
*   **Input**:
    *   `text` (string, required): The search query.
    *   `since` (date, optional): Start date filter.
    *   `until` (date, optional): End date filter.
    *   `topK` (int, optional): Number of results to return.
    *   `timeWeight` (float, optional): Weight for recency in scoring.
*   **Output**:
    *   `searchSessionId` (string): ID for the search session (context).
    *   `contextGraph` (object): The constructed subgraph containing `directNodes`, `nodes`, `edges`, and `sourceRecords`.
    *   `results` (array): List of `recordId`, `score`, and `snippet`.

## 3. Timeline & Visualization

### Get Record Timeline
*   **Endpoint**: `GET /records/timeline`
*   **Description**: Retrieves records in chronological order within a specific date range.
*   **Input (Query Params)**:
    *   `from` (date): Start date.
    *   `to` (date): End date.
*   **Output**:
    *   List of records sorted by time.

### Get Graph Timeline
*   **Endpoint**: `GET /graph/timeline`
*   **Description**: Retrieves a summary of graph data (Event/Person/etc.) around a specific anchor date.
*   **Input (Query Params)**:
    *   `anchorDate` (date): The reference date.
    *   `window` (string/int): The time window size.
*   **Output**:
    *   Graph summary data for the specified period.

## 4. Reasoning & QA

### Ask Question
*   **Endpoint**: `POST /question`
*   **Description**: Asks a question based on the user's records. It uses the Reason Engine to provide an answer along with the reasoning path.
*   **Input**:
    *   `userId` (string, required).
    *   `text` (string, required): The question text.
    *   `searchSessionId` (string, optional): Context ID from a previous `/search` call.
*   **Output**:
    *   `answer` (string): The natural language answer.
    *   `reasoningPath` (object): The path taken to reach the answer (`nodes`, `edges`, `records`).
    *   `confidence` (float): Confidence score.
    *   `caveat` (string, optional): Any warnings or limitations about the answer.
