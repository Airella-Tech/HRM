package com.affin.hrm.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.affin.hrm.Service.UserService;
import com.affin.hrm.DTO.UserDTO;
import com.affin.hrm.DTO.LoginDTO;
import java.util.List;


@RestController
@CrossOrigin(origins = "*")
@RequestMapping(value = "api/hrm/")
public class UserController {
    @Autowired
    private UserService userService;

    @GetMapping("/getusers")
    public List<UserDTO> getUsers(){
        return userService.getAllUsers();
    }

    @GetMapping("/getuser/{userId}")
    public UserDTO getUserById(@PathVariable Integer userId){
        return userService.getUserById(userId);
    }

    @PostMapping("/adduser")
    public UserDTO addUser(@RequestBody UserDTO userDTO){
        return userService.saveUser(userDTO);
    }

    @PutMapping("/updateuser")
    public UserDTO updateUser(@RequestBody UserDTO userDTO){
        return userService.updateUser(userDTO);
    }

    @DeleteMapping("/deleteuser")
    public String deleteUser2(@RequestBody UserDTO userDTO){
        return userService.deleteUser2(userDTO);
    }

    @DeleteMapping("/deleteuser/{userId}")
    public String deleteUser1(@PathVariable Integer userId){
        return userService.deleteUser1(userId);
    }

    @PostMapping("/login")
    public ResponseEntity<UserDTO> loginUser(@RequestBody LoginDTO loginDTO) {
        try {
            UserDTO userDTO = userService.loginUser(loginDTO);
            return ResponseEntity.ok(userDTO);
        } catch (RuntimeException e) {
            // This will return a 401 Unauthorized status if login fails
            return ResponseEntity.status(401).body(null);
        }
    }
}
