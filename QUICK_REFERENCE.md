# 🚀 LUXA Backend - Quick Reference Card

## 📍 Current Status

**Phase 1: Authentication Module** - ✅ Ready for Testing

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Start PostgreSQL Database
docker run -d --name luxa-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=luxa_sales -p 5432:5432 postgres:15

# 2. Start Backend Server
cd backend && npm run start:dev

# 3. Test Registration
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@business.com","password":"Password123!","firstName":"John","lastName":"Doe","businessName":"Test Store"}'
```

---

## 📂 File Structure

```
backend/
├── src/auth/              ← Phase 1 (COMPLETE)
├── src/entities/          ← 7 entities ready
├── PHASES.md              ← Progress tracking
├── PHASE1_TESTING.md      ← Complete testing guide
└── START_HERE.md          ← Setup summary
```

---

## 🎯 Available Endpoints

| Method | Endpoint             | Purpose          | Auth Required |
| ------ | -------------------- | ---------------- | ------------- |
| POST   | `/api/auth/register` | Create account   | ❌            |
| POST   | `/api/auth/login`    | Get JWT tokens   | ❌            |
| POST   | `/api/auth/refresh`  | Refresh token    | ❌            |
| POST   | `/api/auth/logout`   | Logout           | ✅            |
| GET    | `/api/auth/me`       | Get current user | ✅            |

---

## 🧪 Test Sequence

1. **Register** → Get tokens
2. **Login** → Verify tokens work
3. **Get Me** → Test protected route
4. **Refresh** → Get new token
5. **Logout** → End session

**Full Guide:** [PHASE1_TESTING.md](./PHASE1_TESTING.md)

---

## 📋 Completion Checklist

- [ ] PostgreSQL running
- [ ] Server starts on port 3001
- [ ] Register endpoint creates users
- [ ] Login returns JWT tokens
- [ ] Protected routes require auth
- [ ] All 5 endpoints tested

---

## 🔧 Common Commands

```bash
# Check if database is running
docker ps | grep luxa-postgres

# View logs
docker logs luxa-postgres

# Check users table
docker exec -it luxa-postgres psql -U postgres -d luxa_sales -c "SELECT * FROM users;"

# Restart backend
cd backend && npm run start:dev

# Run tests
npm run test
```

---

## 📖 Documentation

| File                                     | Purpose            |
| ---------------------------------------- | ------------------ |
| [START_HERE.md](./START_HERE.md)         | **→ BEGIN HERE**   |
| [PHASE1_TESTING.md](./PHASE1_TESTING.md) | Testing guide      |
| [PHASES.md](./PHASES.md)                 | Progress tracking  |
| [README.md](./README.md)                 | Full documentation |

---

## 🐛 Troubleshooting

**Database connection failed?**

```bash
docker start luxa-postgres
```

**Port 3001 in use?**

```env
# Change in backend/.env
PORT=3002
```

**Module errors?**

```bash
cd backend
npm install
```

---

## 📊 Progress

| Phase | Status  | Endpoints |
| ----- | ------- | --------- |
| 1     | ✅ Done | 5/5       |
| 2     | ⏳ Next | 0/4       |
| 3-7   | ⏳      | 0/29      |

**Total:** 5/38 endpoints (13% complete)

---

## ⚙️ Configuration

**Backend:** `backend/.env`

```env
PORT=3001
JWT_SECRET=dev_jwt_secret_key...
DATABASE_URL=postgresql://...
```

**Database:**

- Host: localhost:5432
- Name: luxa_sales
- User: postgres
- Pass: password

---

## 🎬 Next Steps

1. ✅ Setup PostgreSQL
2. ✅ Start backend server
3. ✅ Test all 5 endpoints
4. ✅ Complete checklist
5. ➡️ **Move to Phase 2**

---

## 📞 Need Help?

- **Setup Issues:** See [START_HERE.md](./START_HERE.md)
- **Testing Guide:** See [PHASE1_TESTING.md](./PHASE1_TESTING.md)
- **Full Docs:** See [README.md](./README.md)

---

**Server URL:** http://localhost:3001/api  
**Database:** postgresql://localhost:5432/luxa_sales  
**Status:** ✅ Ready for Testing!
