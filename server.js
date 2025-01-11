import express from 'express';
import cors from 'cors';
import mysql from 'mysql';
import multer from "multer";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import session from "express-session";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Session
app.use(session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24, //24 ore
    }
}));

app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use('/images', express.static('uploads'));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "cinemaa"
});

const jwtSecret = 'your-secret-key'; 

// Tokeni
const verifyJWT = (req, res, next) => {
    const token = req.cookies.token; 

    if (!token) {
        return res.status(403).json({ auth: false, message: "No token provided" });
    } else {
        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                return res.status(500).json({ auth: false, message: "Failed to authenticate token" });
            } else {
                req.userId = decoded.userId;
                next();
            }
        });
    }
};

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const q = "SELECT * FROM user WHERE email = ?";
        db.query(q, [email], async (err, data) => {
            if (err) return res.status(500).json({ error: "Server error", details: err });
            console.log("Database response:", data);
            const user = data[0];
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const passwordMatches = bcrypt.compareSync(password, user.password);
            if (!passwordMatches) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '24h' });

            res.cookie('token', token, { httpOnly: true });

            req.session.user = user;
            req.session.role = user.role;

            res.json({ login: true, token });
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// autorizimi
app.get('/isUserAuth', verifyJWT, (req, res) => {
    res.json({ auth: true, message: "You are authenticated!" });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    return res.json("Success loging out");
})

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ logout: true });
    });
});

app.use('/images', express.static('uploads'));

app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials:true
}));

app.get('/', (req, res) => {
    if(req.session.role){
        return res.json({valid: true, role: req.session.role})
    } else{
        return res.json({valid: false})
    }
})

//per users
app.get("/users", (req,res) => {
    const q = "SELECT * FROM user";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/users", async (req, res) => {
    const { name, surname, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const q = "INSERT into user (`name`,`surname`,`email`,`password`) VALUES ( ?, ?, ?, ?)";
        const values = [name, surname, email, hashedPassword];

        db.query(q, values, (err, data) => {
            if (err) return res.json(err);
            return res.json("User has been created successfully");
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get("/users/:id", (req, res) => {
    const userId = req.params.id;
    const q = "SELECT * FROM `user` WHERE `id` = ?";
    
    db.query(q, [userId], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching user", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "User not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/users/:id", (req, res) => {
    const userId = req.params.id;
    const q = "UPDATE user SET `name`=?, `surname`=?, `email`=?, `password`=?, `role`=? WHERE id=? ";

    const values = [
        req.body.name,
        req.body.surname,
        req.body.email,
        req.body.password,
        req.body.role,
        userId
    ];

    db.query(q, values, (err, data) => {
        if (err) return res.status(500).json({ error: "Error updating user", details: err });
        return res.json("User updated successfully");
    });
});

app.delete("/users/:id", (req, res) => {
    const userId = req.params.id;
    const q = "DELETE FROM user WHERE id = ?";

    db.query(q, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "An error occurred while deleting the user." });
        }
        if (data.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        return res.status(200).json({ message: "User has been deleted successfully." });
    });
});

//Per Zhanret
app.get("/categories", (req,res) => {
    const q = "SELECT * FROM categories";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/categories", (req,res) => {
    const q = "INSERT into categories (`name`) VALUES (?)";
    const values = [
        req.body.name,

    ];
    db.query(q, values,  (err, data) => {
                if(err) return res.json(err);
                return res.json("Category has been created successfully");
            });
});

app.delete("/categories/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM categories WHERE id = ?";
    
    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("Category has been deleted successfully.");
    });
});

app.get("/categories/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `categories` WHERE `id` = ?";
    
    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching Category", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "Category not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/categories/:id", (req,res) => {
    const cid = req.params.id;
    const q = "UPDATE categories SET `name`=? WHERE id=? ";

    const values = [
        req.body.name,
        cid
    ];
    
    db.query(q, values, (err,data) => {
        if(err) return res.status(500).json({ error: "Error updating Category", details: err });
        return res.json("Category has been updated successfully.");
    });
});

//per SALLA
app.get("/Halls", (req,res) => {
    const q = "SELECT * FROM halls";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/Halls", (req,res) => {
    const q = "INSERT into halls (`name`, `movie_name`, `capacity`) VALUES (?, ?, ?)";
    const values = [
        req.body.name,
        req.body.movie_name,
        req.body.capacity,

    ];
    db.query(q, values,  (err, data) => {
                if(err) return res.json(err);
                return res.json("Hall has been created successfully");
            });
});

app.delete("/Halls/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM halls WHERE id = ?";
    
    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("Hall has been deleted successfully.");
    });
});

app.get("/Halls/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `halls` WHERE `id` = ?";
    
    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching Hall", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "Hall not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/Halls/:id", (req,res) => {
    const cid = req.params.id;
    const q = "UPDATE halls SET `name`=?, `movie_name`=?, `capacity`=? WHERE id=? ";

    const values = [
        req.body.name,
        req.body.movie_name,
        req.body.capacity,
        cid
    ];
    
    db.query(q, values, (err,data) => {
        if(err) return res.status(500).json({ error: "Error updating Hall", details: err });
        return res.json("Hall has been updated successfully.");
    });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.filename + "_" + Date.now() + Path.extname(file.originalname));
    }
})

const uploadM = multer({ storage: storage });

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(500).json({ error: 'Multer error', details: err });
    } else if (err) {
      return res.status(500).json({ error: 'Unknown error', details: err });
    }
    next();
  });

  //Per Movies

app.get("/movies", (req,res) => {
    const q = "SELECT * FROM movies";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.get("/moviesU", (req,res) => {
    const q = "SELECT * FROM movies";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/movies", uploadM.single('foto'), (req, res) => {
    const q = "INSERT INTO movies (`emri`, `foto`, `category`, `date`) VALUES (?, ?, ?, ?)";
    const values = [
        req.body.emri,
        req.file ? req.file.filename : 'foto.jpg', 
        req.body.category,
        req.body.date
    ];
    
    db.query(q, values, (err, data) => {
        if (err) return res.status(500).json({ error: "Error creating movie", details: err });
        return res.json("Movie created successfully");
    });
});



app.delete("/movies/:id", (req, res) => {
    const produktId = req.params.id;
    const query = "DELETE FROM movies WHERE id = ?";

    db.query(query, [produktId], (err, data) => {
        if (err) return res.json(err);
        return res.json("Movie has been deleted successfully.");
    });
});

app.put("/movies/:id", (req, res) => {
    const produktId = req.params.id;
    const q = "UPDATE movies SET `emri`=?, `foto`=?, `category`=?, `date`=? WHERE id=? ";

    const values = [
        req.body.emri,
        req.body.foto,
        req.body.category,
        req.body.date,
        produktId
    ];

    db.query(q, values, (err, data) => {
        if (err) return res.status(500).json({ error: "Error updating movie", details: err });
        return res.json("Movies updated successfully");
    });
});

app.get("/movies/:id", (req, res) => {
    const produktId = req.params.id;
    const q = "SELECT * FROM `movies` WHERE `id` = ?";
    
    db.query(q, [produktId], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching movie", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "Movies not found" });
        }
        return res.json(data[0]);
    });
});

//PER EVENTET
app.get("/events", (req,res) => {
    const q = "SELECT * FROM events";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.get("/eventsU", (req,res) => {
    const q = "SELECT * FROM events";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/events", uploadM.single('foto'), (req, res) => {
    const q = "INSERT INTO events (`name`,`foto`, `date`, `endDate`) VALUES (?, ?, ?, ?)";
    const values = [
        req.body.name,
        req.file ? req.file.filename : 'event.jpg',
        req.body.date,
        req.body.endDate
    ];
    db.query(q, values,  (err, data) => {
        if (err) return res.status(500).json({ error: "Error creating event", details: err });
        return res.json("Event created successfully");
    });
});

app.delete("/events/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM events WHERE id = ?";
    
    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("Event has been deleted successfully.");
    });
});

app.put("/Announcments/:id", (req, res) => {
    const cid = req.params.id;
    const q = "UPDATE Announcments SET `name`=?, `reason`=?, `date`=? WHERE id=? ";

    const values = [
        req.body.name,
        req.body.reason,
        req.body.date.split("T")[0],
        cid
    ];

    db.query(q, values, (err, data) => {
        if (err) return res.status(500).json({ error: "Error updating Announcment", details: err });
        return res.json("Announcment has been updated successfully.");
    });
});
app.put("/events/:id", (req, res) => {
    const cid = req.params.id;
    const { name, foto, date, endDate } = req.body;
  
    if (!name || !date || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    const q = "UPDATE events SET `name`=?, `foto`=?, `date`=?, `endDate`=? WHERE id=?";
    const values = [name, foto || 'default.jpg', date, endDate, cid];
  
    db.query(q, values, (err, data) => {
      if (err) {
        console.error("Error updating event:", err);
        return res.status(500).json({ error: "Error updating event", details: err });
      }
      return res.json("Event has been updated successfully.");
    });
  });
  

app.get("/events/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `events` WHERE `id` = ?";
    
    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching Event", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "Event not found::)" });
        }
        return res.json(data[0]);
    });
});

//Per Announcments
app.get("/Announcments", (req,res) => {
    const q = "SELECT * FROM Announcments";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.get("/AnnouncmentsU", (req,res) => {
    const q = "SELECT * FROM Announcments";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/Announcments", (req,res) => {
    const q = "INSERT into Announcments (`name`, `reason`, `date`) VALUES (?, ?, ?)";
    const values = [
        req.body.name,
        req.body.reason,
        req.body.date,

    ];
    db.query(q, values,  (err, data) => {
                if(err) return res.json(err);
                return res.json("Announcment has been created successfully");
            });
});

app.delete("/Announcments/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM Announcments WHERE id = ?";

    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("Announcment has been deleted successfully.");
    });
});

app.get("/Announcments/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `Announcments` WHERE `id` = ?";

    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching Announcment", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "Announcment not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/Announcments/:id", (req, res) => {
    const cid = req.params.id;
    const q = "UPDATE Announcments SET `name`=?, `reason`=?, `date`=? WHERE id=? ";

    const values = [
        req.body.name,
        req.body.reason,
        req.body.date.split("T")[0],
        cid
    ];

    db.query(q, values, (err, data) => {
        if (err) return res.status(500).json({ error: "Error updating Announcment", details: err });
        return res.json("Announcment has been updated successfully.");
    });
});

//per Tickets
app.get("/tickets", (req,res) => {
    const q = "SELECT * FROM tickets";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/tickets", (req, res) => {
    const q = "INSERT INTO tickets (`user_name`, `user_surname`, `movie_emri`, `hall_name`, `movie_date`) VALUES (?, ?, ?, ?, ?)";
    const values = [
        req.body.user_name,
        req.body.user_surname,
        req.body.movie_emri,
        req.body.hall_name,
        req.body.movie_date
    ];
    db.query(q, values, (err, data) => {
        if (err) {
            return res.json(err, "error while adding new ticket");
        }else{
            return res.json("Ticket has been created successfully")
        }
    });
});

app.delete("/tickets/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM tickets WHERE id = ?";
    
    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("tickets has been deleted successfully.");
    });
});

app.get("/tickets/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `tickets` WHERE `id` = ?";
    
    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching ticket", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "ticket not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/tickets/:id", (req,res) => {
    const cid = req.params.id;
        const q = "UPDATE tickets SET `user_name`=?, `user_surname`=?, `movie_emri`=?, `hall_name`=?, `movie_date`=? WHERE id=? ";


    const values = [
        req.body.user_name,
        req.body.user_surname,
        req.body.movie_emri,
        req.body.hall_name,
        req.body.movie_date,
        cid
    ];

    db.query(q, values, (err, data) => {
        if (err) {
          console.error("Error updating ticket:", err);
          return res.status(500).json({ error: "Error updating ticket", details: err });
        }
        return res.json("Ticket has been updated successfully.");
      });
      
});

//per Location
app.get("/location", (req,res) => {
    const q = "SELECT * FROM location";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.get("/locationU", (req,res) => {
    const q = "SELECT * FROM location";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

app.post("/location", (req,res) => {
    const q = "INSERT into location (`name`) VALUES (?)";
    const values = [
        req.body.name,

    ];
    db.query(q, values,  (err, data) => {
                if(err) return res.json(err);
                return res.json("location has been created successfully");
            });
});

app.delete("/location/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM location WHERE id = ?";

    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("location has been deleted successfully.");
    });
});

app.get("/location/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `location` WHERE `id` = ?";

    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching location", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "location not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/location/:id", (req,res) => {
    const cid = req.params.id;
    const q = "UPDATE location SET `name`=? WHERE id=? ";

    const values = [
        req.body.name,
        cid
    ];

    db.query(q, values, (err,data) => {
        if(err) return res.status(500).json({ error: "Error updating location", details: err });
        return res.json("location has been updated successfully.");
    });
});
//-----------------------------
//per Ligjeruesin
app.get("/ligjeruesi", (req,res) => {
    const q = "SELECT * FROM ligjeruesi";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});


app.post("/ligjeruesi", (req,res) => {
    const q = "INSERT into ligjeruesi (`name`, `dept`, `email`) VALUES (?, ?, ?)";
    const values = [
        req.body.name,
        req.body.dept,
        req.body.email,

    ];
    db.query(q, values,  (err, data) => {
                if(err) return res.json(err);
                return res.json("ligjeruesi has been created successfully");
            });
});

app.delete("/ligjeruesi/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM ligjeruesi WHERE id = ?";

    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("ligjeruesi has been deleted successfully.");
    });
});

app.get("/ligjeruesi/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `ligjeruesi` WHERE `id` = ?";

    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching ligjeruesi", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "ligjeruesi not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/ligjeruesi/:id", (req,res) => {
    const cid = req.params.id;
    const q = "UPDATE ligjeruesi SET `name`=?, `dept`=?, `email`=? WHERE id=? ";

    const values = [
        req.body.name,
        req.body.dept,
        req.body.email,
        cid
    ];

    db.query(q, values, (err,data) => {
        if(err) return res.status(500).json({ error: "Error updating ligjeruesi", details: err });
        return res.json("ligjeruesi has been updated successfully.");
    });
});
//------------------------
//per Ligjerata
app.get("/ligjerata", (req,res) => {
    const q = "SELECT * FROM ligjerata";
    db.query(q, (err,data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});


app.post("/ligjerata", (req,res) => {
    const q = "INSERT into ligjerata (`name`, `prof_id`) VALUES (?, ?)";
    const values = [
        req.body.name,
        req.body.prof_id,

    ];
    db.query(q, values,  (err, data) => {
                if(err) return res.json(err);
                return res.json("ligjerata has been created successfully");
            });
});

app.delete("/ligjerata/:id", (req,res) => {
    const Id = req.params.id;
    const q = "DELETE FROM ligjerata WHERE id = ?";

    db.query(q, [Id], (err,data) => {
        if(err) return res.json(err);
        return res.json("ligjerata has been deleted successfully.");
    });
});

app.get("/ligjerata/:id", (req, res) => {
    const Id = req.params.id;
    const q = "SELECT * FROM `ligjerata` WHERE `id` = ?";

    db.query(q, [Id], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching ligjerata", details: err });
        }
        if (data.length === 0) {
            return res.status(404).json({ error: "ligjerata not found::)" });
        }
        return res.json(data[0]);
    });
});

app.put("/ligjerata/:id", (req,res) => {
    const cid = req.params.id;
    const q = "UPDATE ligjerata SET `name`=?, `prof_id`=? WHERE id=? ";

    const values = [
        req.body.name,
        req.body.prof_id,
        cid
    ];

    db.query(q, values, (err,data) => {
        if(err) return res.status(500).json({ error: "Error updating ligjerata", details: err });
        return res.json("ligjerata has been updated successfully.");
    });
});
app.listen(3002, () => {
    console.log("connected to backend!");
});
