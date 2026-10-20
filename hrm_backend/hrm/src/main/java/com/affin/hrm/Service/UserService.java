package com.affin.hrm.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import com.affin.hrm.Model.User;
import com.affin.hrm.Repo.UserRepo;
import com.affin.hrm.DTO.UserDTO;
import com.affin.hrm.DTO.LoginDTO;
import java.util.List;
import java.util.Optional;


@Service
@Transactional
public class UserService {
    @Autowired
    private UserRepo userRepo;

    @Autowired
    private ModelMapper modelMapper;

    public List<UserDTO> getAllUsers(){
        List<User>userList = userRepo.findAll();
        return modelMapper.map(userList, new TypeToken<List<UserDTO>>(){}.getType());
    }

    public UserDTO getUserById(int userId){
        User user = userRepo.getUserById(userId);
        return modelMapper.map(user, UserDTO.class);
    }

    public UserDTO saveUser(UserDTO userDTO){
        userRepo.save(modelMapper.map(userDTO, User.class));
        return userDTO;
    }

    public UserDTO updateUser(UserDTO userDTO){
        userRepo.save(modelMapper.map(userDTO, User.class));
        return userDTO;
    }

    public String deleteUser1(Integer userId){
        userRepo.deleteById(userId);
        return "User deleted1";
    }

    public String deleteUser2(UserDTO userDTO){
        userRepo.delete(modelMapper.map(userDTO, User.class));
        return "User deleted2";
    }

    public UserDTO loginUser(LoginDTO loginDTO) {
        // Find the user by email
        Optional<User> userOptional = userRepo.findByEmail(loginDTO.getEmail());

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Check if the password matches
            if (user.getPassword().equals(loginDTO.getPassword())) {
                // Passwords match, return the user's data
                return modelMapper.map(user, UserDTO.class);
            } else {
                // Invalid password
                throw new RuntimeException("Invalid email or password");
            }
        } else {
            // No user found with that email
            throw new RuntimeException("Invalid email or password");
        }
    }
}
