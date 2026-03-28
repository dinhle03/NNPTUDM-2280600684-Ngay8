var express = require("express");
var router = express.Router();
let { uploadImage, uploadExcel } = require("../utils/uploadHandler");
let path = require("path");
let exceljs = require("exceljs");
let mongoose = require("mongoose");
let slugify = require("slugify");
let crypto = require("crypto");

let categoryModel = require("../schemas/categories");
let productModel = require("../schemas/products");
let inventoryModel = require("../schemas/inventories");
let roleModel = require("../schemas/roles");

let userController = require("../controllers/users");
let sendEmail = require("../utils/mailHandler");

router.get("/:filename", function (req, res, next) {
  let pathFile = path.join(__dirname, "../uploads", req.params.filename);
  res.sendFile(pathFile);
});

router.post("/one_file", uploadImage.single("file"), function (req, res, next) {
  if (!req.file) {
    return res.status(404).send({ message: "file khong duoc de trong" });
  }
  res.send({
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
  });
});

router.post(
  "/multiple_file",
  uploadImage.array("files"),
  function (req, res, next) {
    if (!req.files) {
      return res.status(404).send({ message: "file khong duoc de trong" });
    }
    res.send(
      req.files.map((f) => ({
        filename: f.filename,
        path: f.path,
        size: f.size,
      }))
    );
  }
);

router.post(
  "/excel",
  uploadExcel.single("file"),
  async function (req, res, next) {
    try {
      let workbook = new exceljs.Workbook();
      let pathFile = path.join(__dirname, "../uploads", req.file.filename);
      await workbook.xlsx.readFile(pathFile);
      let worksheet = workbook.worksheets[0];

      let categories = await categoryModel.find({});
      let categoryMap = new Map();
      categories.forEach((cat) => categoryMap.set(cat.name, cat._id));

      let products = await productModel.find({});
      let getTitle = products.map((p) => p.title);
      let getSku = products.map((p) => p.sku);
      let result = [];

      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const contentRow = worksheet.getRow(rowNum);
        let sku = contentRow.getCell(1).value;
        let title = contentRow.getCell(2).value;
        let category = contentRow.getCell(3).value;
        let price = Number.parseInt(contentRow.getCell(4).value);
        let stock = Number.parseInt(contentRow.getCell(5).value);

        if (!sku || !title) continue;

        let session = await mongoose.startSession();
        session.startTransaction();
        try {
          let newProduct = new productModel({
            sku: sku,
            title: title,
            slug: slugify(title.toString(), { lower: true, trim: true }),
            price: price,
            description: title,
            category: categoryMap.get(category),
          });
          await newProduct.save({ session });

          let newInventory = new inventoryModel({
            product: newProduct._id,
            stock: stock,
          });
          await newInventory.save({ session });

          await session.commitTransaction();
          result.push({ sku, status: "Thành công" });
        } catch (error) {
          await session.abortTransaction();
          result.push({ sku, status: "Lỗi", message: error.message });
        } finally {
          session.endSession();
        }
      }
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  }
);

router.post(
  "/import-users",
  uploadExcel.single("file"),
  async function (req, res, next) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send({ message: "Vui lòng đính kèm file Excel" });
      }

      let workbook = new exceljs.Workbook();
      let pathFile = path.join(__dirname, "../uploads", req.file.filename);
      await workbook.xlsx.readFile(pathFile);
      let worksheet = workbook.worksheets[0];

      let roleUser = await roleModel.findOne({ name: "user" });
      if (!roleUser) {
        roleUser = await roleModel.create({
          name: "user",
          description: "Default customer role",
        });
      }

      let report = { success: 0, fail: 0, details: [] };

      for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        let username = row.getCell(1).value;
        let email = row.getCell(2).value;

        if (username && typeof username === "object")
          username = username.text || username.result;
        if (email && typeof email === "object")
          email = email.text || email.result;

        if (!username || !email) continue;

        try {
          const existUser = await userController.GetAnUserByUsername(username);
          const existEmail = await userController.GetAnUserByEmail(email);

          if (existUser || existEmail) {
            report.fail++;
            report.details.push({
              username,
              status: "Thất bại",
              reason: "Username/Email đã tồn tại",
            });
            continue;
          }

          const passwordRaw = crypto.randomBytes(8).toString("hex");

          await userController.CreateAnUser(
            username,
            passwordRaw,
            email,
            roleUser._id,
            null, // session
            username, // fullName
            undefined, // avatar
            true, // status
            0 // loginCount
          );

          await sendEmail({
            email: email,
            username: username,
            password: passwordRaw,
          });

          report.success++;
          report.details.push({ username, email, status: "Thành công" });
        } catch (err) {
          report.fail++;
          report.details.push({ username, status: "Lỗi", reason: err.message });
        }
      }

      res.send({
        message: "Hoàn tất quá trình Import và Gửi mail",
        summary: report,
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  }
);

module.exports = router;
