import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv"

const app = express();
const port = 3000;
env.config();


const db = new pg.Client({
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_DATABASE,
   host: process.env.DB_HOST,
   port: 5432,
});


db.connect();

app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: true}));


app.get("/", async (req, res) => {
   try {
     const result = await db.query("SELECT * FROM subjects ORDER BY id ASC")
     const data = result.rows
     console.log(data)
     res.render("new.ejs", {subjects: data, heading: null})
   } catch(err){
      console.log(err)
   }
});

app.get("/admin/home", (req, res) => {
   res.redirect("/")
})

app.get("/student-data", async(req, res) => {
   try{
      const result = await db.query("SELECT * FROM student_details")
      const data = result.rows
      res.render("new.ejs", {students: data, total: data.length, heading: null})
   } catch(err){
      console.log(err)
   }
})

app.get("/student/:id", async(req, res) => {
   const requestedId = req.params.id
   try{
      const studentResult = await db.query("SELECT * FROM student_details WHERE id = $1", [
         requestedId
      ]);
      const studentData = studentResult.rows[0];
      
      const result = await db.query("SELECT subjects.id, student_id, subject_id, subject, class_score, exams_score, position, grade, remarks FROM reports JOIN student_details ON student_details.id = student_id JOIN subjects ON subjects.id = subject_id WHERE student_id = $1 ORDER BY student_details.id ASC", [
         requestedId
      ]);
      const data = result.rows
      console.log(requestedId);
      console.log(data)
      
         res.render("result.ejs", {subjects: data, studentData: studentData})
   } catch(err){
      console.log(err)
   }
})

app.post("/submit", async (req, res) => {
   const stdName = req.body.stdName
   const stdRollNo = req.body.rollNo;
   const attendance = req.body.attendance
   const stdClass = req.body.class
   const currentTerm = req.body.currentTerm
   const termEnding = req.body.termEnding
   const nextTerm = req.body.nextTerm
   const reportDate = req.body.reportDate
   const subjectID = req.body.subject_id
   try{
      const studentResult = await db.query("INSERT INTO student_details(name, roll_no, attendance, class, current_term, term_ending, next_term, report_date) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [
         stdName, stdRollNo, attendance, stdClass, currentTerm, termEnding, nextTerm, reportDate
      ]);
      const studentData = studentResult.rows[0];
      const studentID = studentData.id

      const subjectsData = req.body.subjects

      const insertPromises = subjectsData.map(subjects => {
         console.log(subjects);
         return db.query("INSERT INTO reports (class_score, exams_score, position, grade, remarks, student_id, subject_id) VALUES($1, $2, $3, $4, $5, $6, $7)", [
            subjects.classScore, subjects.examsScore, subjects.position, subjects.grade, subjects.remarks, studentID, subjects.subject_id
         ]);
         
      })

      await Promise.all(insertPromises);

      const result = await db.query("SELECT subjects.id, student_id, subject_id, subject, class_score, exams_score, position, grade, remarks FROM reports JOIN student_details ON student_details.id = student_id JOIN subjects ON subjects.id = subject_id WHERE student_id = $1 ORDER BY student_details.id ASC", [
         studentID
      ]);
      const data = result.rows

      console.log(studentID);
      console.log(data)
      
         res.render("result.ejs", {subjects: data, studentData: studentData})
   } catch (err){
      console.log(err);
   }
  
})

app.post("/search", async(req, res) => {
   const search = req.body.search
   try {
     const result = await db.query("SELECT * FROM student_details WHERE LOWER(name || ' ' || class) LIKE '%' || $1 || '%' ", [
      search.toLowerCase()
     ])
     if(search !== ""){
      if(result.rows.length > 1) {
         const data = result.rows
         res.render("new.ejs", {searchDatas: data, heading: "Students Found"})
        } else if(result.rows.length === 1){
         const data = result.rows[0]
         res.render("new.ejs", {searchData: data, heading: "Student Found"})
        } else {
         res.render("new.ejs", {searchData: null, heading: "No Student Found"})
        }
     } else {
      res.render("new.ejs", {searchData: null, heading: "No Student Found"})
     }
     
     
   } catch(err){
      console.log(err)
   }
})


app.post("/edit", async(req, res) => {
   const requestedId = req.body.id
   try{
      const studentResult = await db.query("SELECT * FROM student_details WHERE id = $1", [
         requestedId
      ]);
      const studentData = studentResult.rows[0];
      
      const result = await db.query("SELECT subjects.id, student_id, subject_id, subject, class_score, exams_score, position, grade, remarks FROM reports JOIN student_details ON student_details.id = student_id JOIN subjects ON subjects.id = subject_id WHERE student_id = $1", [
         requestedId
      ]);
      const data = result.rows
      console.log(requestedId);
      console.log(data)
      
         res.render("modify.ejs", {subjects: data, studentData: studentData})
   } catch(err){
      console.log(err)
   }
})

app.post("/update", async(req, res) => {
   const studentId = req.body.id
   const stdName = req.body.stdName
   const stdRollNo = req.body.rollNo;
   const attendance = req.body.attendance
   const stdClass = req.body.class
   const currentTerm = req.body.currentTerm
   const termEnding = req.body.termEnding
   const nextTerm = req.body.nextTerm
   const reportDate = req.body.reportDate
   try{
      const studentResult = await db.query("UPDATE student_details SET(name, roll_no, attendance, class, current_term, term_ending, next_term, report_date) = ($1, $2, $3, $4, $5, $6, $7, $8) WHERE id = $9 RETURNING *;", [
         stdName, stdRollNo, attendance, stdClass, currentTerm, termEnding, nextTerm, reportDate, studentId
      ]);

      const studentData = studentResult.rows[0];

      const subjectsData = req.body.subjects

      const insertPromises = subjectsData.map(subjects => {
         console.log(subjects);
         return db.query("UPDATE reports SET (class_score, exams_score, position, grade, remarks) = ($1, $2, $3, $4, $5) WHERE student_id = $6 AND subject_id = $7", [
            subjects.classScore, subjects.examsScore, subjects.position, subjects.grade, subjects.remarks, studentId, subjects.subject_id, 
         ]);
         
      })

      await Promise.all(insertPromises);

      const result = await db.query("SELECT subjects.id, student_id, subject_id, subject, class_score, exams_score, position, grade, remarks FROM reports JOIN student_details ON student_details.id = student_id JOIN subjects ON subjects.id = subject_id WHERE student_id = $1 ", [
         studentId
      ]);
      const data = result.rows
      console.log(data)
      console.log(studentId);
         res.render("result.ejs", {subjects: data, studentData: studentData})
   } catch (err){
      console.log(err);
   }
}
)

app.post("/delete", async(req, res) => {
   const requestedId = req.body.id
   try{
       await db.query("DELETE FROM reports  WHERE student_id = $1 ", [
         requestedId
      ]);
       await db.query("DELETE FROM student_details WHERE id = $1", [
         requestedId
      ]);
         res.redirect("/student-data")
   } catch(err){
      console.log(err)
   }
})

app.listen(port, () => {
   console.log(`Listens on port ${port}`);
})