Create API documentation for: $ARGUMENTS

Follow these steps to generate wiki documentation:

## Step 1: Analyze the API

If the user provides a file path or endpoint name:
1. Search for the controller/feature file using Glob or Grep
2. Read the relevant source code to understand:
   - HTTP method and endpoint URL
   - Request parameters (path, query, body)
   - Response format and fields
   - Authentication requirements
   - Error responses

If the user provides a description:
1. Ask clarifying questions about the API details
2. Gather all necessary information before generating

## Step 2: Generate Documentation

Create a markdown file in `wiki/docs/` folder following this exact template format:

```markdown
---
title: [API Title]
description: [Brief description of what this API does]
category: API
order: [number]
url: https://wiki-ai-ent-8386.vercel.app/docs/[filename-without-extension]
---

# [Emoji] [API Title]

## Overview

[2-3 sentence description of what this API does and when to use it]

---

## 🔗 Endpoint Information

- **URL**: `/v[version]/[endpoint-path]`
- **Method**: `[GET/POST/PUT/PATCH/DELETE]`
- **Authentication**: Required (JWT Token)
- **Organization Header**: Required
- **Version**: v[version]

---

## 🔐 Authentication

This endpoint requires a valid JWT token in the Authorization header:

\`\`\`http
Authorization: Bearer <your-jwt-token>
X-Org-Id: <organization-id>
\`\`\`

---

## 📝 Request Parameters

### Path Parameters (if applicable)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param` | `string` | ✅ | Description |

### Query Parameters (if applicable)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param` | `string` | ❌ | Description (default: value) |

### Request Body (if applicable)

\`\`\`json
{
  "field": "value"
}
\`\`\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | `string` | ✅ | Description |

---

## 📊 Response Format

### Success Response (200 OK)

\`\`\`json
{
  "data": {
    // response object
  }
}
\`\`\`

---

## 📋 Response Fields

### [Object Name]

| Field | Type | Description |
|-------|------|-------------|
| `field` | `string` | Description |

---

## 📋 Example Requests

### Basic Request

\`\`\`bash
curl -X [METHOD] "https://api-ai.dev.redbrick.ai/v[version]/[endpoint]" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "X-Org-Id: <organization-id>"
\`\`\`

### Using JavaScript/Fetch

\`\`\`javascript
const response = await fetch('https://api-ai.dev.redbrick.ai/v[version]/[endpoint]', {
  method: '[METHOD]',
  headers: {
    'Authorization': 'Bearer <your-jwt-token>',
    'X-Org-Id': '<organization-id>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ /* request body if POST/PUT/PATCH */ })
});

const data = await response.json();
\`\`\`

### Using Python/Requests

\`\`\`python
import requests

headers = {
    'Authorization': 'Bearer <your-jwt-token>',
    'X-Org-Id': '<organization-id>'
}

response = requests.[method](
    'https://api-ai.dev.redbrick.ai/v[version]/[endpoint]',
    headers=headers,
    json={'field': 'value'}  # if POST/PUT/PATCH
)

data = response.json()
\`\`\`

---

## ⚠️ Error Responses

### 401 Unauthorized

\`\`\`json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
\`\`\`

### 403 Forbidden

\`\`\`json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
\`\`\`

### 404 Not Found

\`\`\`json
{
  "statusCode": 404,
  "message": "[Resource] not found",
  "error": "Not Found"
}
\`\`\`

### 400 Bad Request

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "error message"
    }
  ]
}
\`\`\`

### 500 Internal Server Error

\`\`\`json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
\`\`\`

---

## 💡 Notes

- [Any important implementation notes]
- [Caching behavior]
- [Rate limiting]
- [Special considerations]

---

## 🔗 Related APIs

- `[METHOD] /v[version]/[related-endpoint]` - [Description]
```

## Step 3: Naming Convention

Use kebab-case for the filename based on the API purpose:
- `api-[action]-[resource].md` for general APIs
- `[domain]-[action]-[resource].md` for domain-specific APIs

Examples:
- `api-get-document-detail.md`
- `billing-create-subscription.md`
- `canvas-export-pdf.md`

## Step 4: Emoji Selection Guide

Use appropriate emoji for the main title based on the API type:
- 📄 - Document-related APIs
- 📂 - Folder/File-related APIs
- 👤 - User-related APIs
- 🔐 - Authentication/Security APIs
- 💳 - Payment/Billing APIs
- 🎨 - Canvas APIs
- 💬 - Chat/Conversation APIs
- 🔗 - Integration/Connector APIs
- 📊 - Analytics/Statistics APIs
- ⚙️ - Settings/Configuration APIs
- 🔍 - Search APIs
- 📝 - CRUD operations
- 🗑️ - Delete/Trash APIs
- 📤 - Upload/Export APIs
- 📥 - Download/Import APIs

## Step 5: Quality Checks

Before saving, ensure:
1. All sections have proper content (no placeholders left)
2. JSON examples are valid and properly formatted
3. Tables are properly aligned
4. Code blocks have correct language highlighting
5. All links use the correct base URL: `https://api-ai.dev.redbrick.ai`
6. Response examples match actual API response structure
7. Error responses include common error cases

## Step 6: Save and Confirm

1. Write the file to `wiki/docs/[filename].md`
2. Display the file path to the user
3. Provide a summary of what was documented

Remember:
- Always read the source code to ensure accuracy
- Include all request parameters and response fields
- Use realistic example values in JSON samples
- Document any special behavior or edge cases
