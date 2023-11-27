const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const router = express.Router();
const path = require('path');
const conn = require('../config/database');
router.use(express.static("Images"));
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
require("dotenv").config();
const PORT = process.env.PORT || 3001;

const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.REACT_APP_S3_KEY,
        secretAccessKey: process.env.REACT_APP_S3_SECRET,
    }
})

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'contistoryprompt',
        key: function (req, file, cb) {
            cb(null, Date.now().toString()) //업로드시 파일명 변경가능
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
})

router.post("/submit", upload.single("file"), (req, res) => {
    console.log(req.file, "파일");
    console.log(req.body.email)
    const user_profilepath = req.file.location;
    console.log(req.file.location)
    const user_email = req.body.email

    let sql = 'UPDATE t_user SET user_profilepath = ? WHERE user_email = ?'
    let sql2 = 'SELECT * FROM t_user WHERE user_email=?'
    conn.query(sql, [user_profilepath, user_email], (err, result) => {
        if (err) {
            console.log(err);

            res.
                status(500).send("Internal Server Error");
        } else {
            conn.query(sql2, [user_email], (err, rows) => {
                if (rows) {
                    console.log(rows)
                    res.json(rows[0].user_profilepath)
                } else if (err) {
                    console.log(err)
                    res.status(500).send("err")
                }
            })
        }

    });

});

// data:image/png;base64,

// const fileName = 'test.jpg';
// const fileUrl = `http://localhost:${PORT}/${fileName}`;
// const filePath = path.join(__dirname, '../files', fileName);

// 파일 생성하기
router.get('/createFile', (req, res) => {
    res.render('createFile');
});

router.post('/createFile', (req, res) => {
    console.log(req.body.store);
    // const data = req.body.data;
    // 파일명이 없으면 기본값으로 설정
    const fileName = (req.body.store.title || '제목없음') + '.corn';
    const store = req.body.store;
    // console.log(data, '내용')
    console.log(fileName, '제목')
    const jsonString = JSON.stringify(store);

    fs.writeFile(fileName, jsonString, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            console.log('파일이 성공적으로 생성되었습니다');

            // 클라이언트에게 파일 다운로드 링크를 제공
            const downloadLink = {
                downloadLink: `/upload/download?fileName=${encodeURIComponent(fileName)}`
            };
            res.json(downloadLink);
        }
    });
});

router.get('/save', (req, res, next) => {
    res.send(`
    <img src=${fileUrl} />
    
    <br>
    <br>
    <a href="/download" download>Download</a>
    `);
});

// 파일 다운로드
router.get('/download', (req, res) => {
    const fileName = req.query.fileName;
    if (!fileName) {
        res.status(400).send('파일 이름이 누락되었습니다');
        return;
    }

    const filePath = path.join(__dirname, '../files', fileName);

    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('내부 서버 오류');
        }
    });
});


// 파일 불러오기
router.get('/readFile', (req, res) => {
    console.log(req.query.title, '파일이름')
    const parsedUrl = new URL(`http://localhost:${PORT}${req.url}`);
    const queryData = parsedUrl.searchParams;
    const fileName = (req.query.title) + '.corn';
    const filePath = path.join(__dirname, '../files', `${fileName}`);

    // 파일 존재 여부 체크
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.send('파일을 찾을 수 없습니다');
            return;
        }
        // 파일 읽기
        fs.readFile(filePath, 'utf8', (err, data) => {
            console.log(data, '데이터')
            if (err) {
                res.send('파일을 읽는 중 오류가 발생했습니다');
                console.error(err);
                return;
            }
            // res.send(data);
            // 파일 경로를 클라이언트에게 응답으로 보냅니다.
            res.json({ data, filePath });
            console.log(filePath, '파일경로')
        });
    });
});

module.exports = router;