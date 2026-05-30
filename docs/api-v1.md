# Nexus — API v1

API REST en lecture seule. Authentification par token Bearer.

## Authentification

Générer un token depuis **Paramètres > Intégrations > API REST**.

Toutes les requêtes doivent inclure le header :

```
Authorization: Bearer <token>
```

Les données retournées sont automatiquement filtrées par établissement (le token est lié à votre établissement).

---

## Endpoints

### GET /api/v1/shifts

Retourne les shifts planifiés de l'établissement.

**Paramètres (query string)**

| Paramètre     | Type   | Description                              |
|---------------|--------|------------------------------------------|
| `from`        | date   | Date de début `YYYY-MM-DD` (inclusif)    |
| `to`          | date   | Date de fin `YYYY-MM-DD` (inclusif)      |
| `employee_id` | uuid   | Filtrer par employé                      |

**Réponse**

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "date": "2025-06-02",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "break_minutes": 30,
      "position": "Serveur",
      "notes": null,
      "status": "published"
    }
  ],
  "count": 1
}
```

**Exemple**

```bash
curl -H "Authorization: Bearer nxt_..." \
  "https://votre-app.vercel.app/api/v1/shifts?from=2025-06-01&to=2025-06-30"
```

Limite : 500 résultats par requête.

---

### GET /api/v1/employees

Retourne la liste des employés actifs de l'établissement.

**Paramètres** — aucun

**Réponse**

```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Marie Dupont",
      "email": "marie@exemple.fr",
      "position": "Serveuse",
      "contract_type": "CDI",
      "weekly_hours": 35,
      "phone": "+33 6 00 00 00 00"
    }
  ],
  "count": 1
}
```

**Exemple**

```bash
curl -H "Authorization: Bearer nxt_..." \
  "https://votre-app.vercel.app/api/v1/employees"
```

---

### GET /api/v1/leaves

Retourne les demandes de congés de l'établissement.

**Paramètres (query string)**

| Paramètre | Type   | Description                                        |
|-----------|--------|----------------------------------------------------|
| `status`  | string | Filtrer par statut : `pending`, `approved`, `rejected` |
| `from`    | date   | Date de début `YYYY-MM-DD` (inclusif)              |
| `to`      | date   | Date de fin `YYYY-MM-DD` (inclusif)                |

**Réponse**

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "type": "Congés payés",
      "start_date": "2025-07-14",
      "end_date": "2025-07-25",
      "status": "approved",
      "notes": null,
      "created_at": "2025-06-01T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Exemple**

```bash
curl -H "Authorization: Bearer nxt_..." \
  "https://votre-app.vercel.app/api/v1/leaves?status=pending"
```

Limite : 200 résultats par requête.

---

## Codes d'erreur

| Code | Description                              |
|------|------------------------------------------|
| 401  | Token manquant ou invalide               |
| 500  | Erreur serveur                           |
